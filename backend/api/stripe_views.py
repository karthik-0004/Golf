from datetime import timedelta
import logging

import stripe
from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SubscriptionPlan, User
from .serializers import CreateSubscriptionSerializer, SubscriptionPlanSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)


def _get_value(payload, key, default=None):
    if payload is None:
        return default
    if isinstance(payload, dict):
        return payload.get(key, default)
    try:
        return payload[key]
    except (KeyError, TypeError):
        return default


def _activate_user_subscription(user, plan_name, subscription_id):
    if plan_name not in ["monthly", "yearly"]:
        return

    today = timezone.now().date()
    duration = timedelta(days=30) if plan_name == "monthly" else timedelta(days=365)
    user.is_subscriber = True
    user.subscription_plan = plan_name
    user.subscription_status = "active"
    user.subscription_start_date = today
    user.subscription_end_date = today + duration
    user.stripe_subscription_id = subscription_id
    user.save(
        update_fields=[
            "is_subscriber",
            "subscription_plan",
            "subscription_status",
            "subscription_start_date",
            "subscription_end_date",
            "stripe_subscription_id",
        ]
    )


class SubscriptionPlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("price")
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"detail": "Stripe is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = CreateSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan_name = serializer.validated_data["plan_name"]

        plan = SubscriptionPlan.objects.filter(name=plan_name, is_active=True).first()
        if not plan:
            return Response(
                {"detail": "Subscription plan not found or inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fallback_price_id_map = {
            "monthly": settings.STRIPE_PRICE_ID_MONTHLY,
            "yearly": settings.STRIPE_PRICE_ID_YEARLY,
        }
        stripe_price_id = fallback_price_id_map.get(plan_name) or plan.stripe_price_id

        if not stripe_price_id:
            return Response(
                {"detail": "Stripe price ID is missing for the selected plan."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if stripe_price_id in {"price_monthly_test", "price_yearly_test"}:
            return Response(
                {"detail": "Stripe price ID is still set to a placeholder value on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        user = request.user
        try:
            if not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=f"{user.first_name} {user.last_name}".strip() or user.email,
                )
                user.stripe_customer_id = customer["id"]
                user.save(update_fields=["stripe_customer_id"])

            session = stripe.checkout.Session.create(
                customer=user.stripe_customer_id,
                payment_method_types=settings.STRIPE_PAYMENT_METHOD_TYPES,
                line_items=[{"price": stripe_price_id, "quantity": 1}],
                mode="subscription",
                success_url=f"{settings.FRONTEND_URL}/dashboard?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/subscribe?payment=cancelled",
                metadata={"user_id": str(user.id), "plan_name": plan_name},
            )
        except stripe.error.StripeError as exc:
            message = getattr(getattr(exc, "error", None), "message", None) or str(exc)
            logger.exception("Stripe checkout creation failed for user_id=%s plan=%s", user.id, plan_name)
            return Response(
                {"detail": f"Stripe checkout failed: {message}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Unexpected checkout failure for user_id=%s plan=%s", user.id, plan_name)
            return Response(
                {"detail": "Unable to create checkout session right now."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"session_url": session.url}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response({"detail": "Invalid payload or signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = _get_value(event, "type")
        data = _get_value(event, "data", {})
        data_object = _get_value(data, "object", {})

        if event_type == "checkout.session.completed":
            metadata = _get_value(data_object, "metadata", {})
            user_id = _get_value(metadata, "user_id")
            plan_name = _get_value(metadata, "plan_name")
            subscription_id = _get_value(data_object, "subscription")

            user = User.objects.filter(id=user_id).first()
            if user:
                _activate_user_subscription(user, plan_name, subscription_id)

        elif event_type == "customer.subscription.deleted":
            subscription_id = _get_value(data_object, "id")
            user = User.objects.filter(stripe_subscription_id=subscription_id).first()
            if user:
                user.is_subscriber = False
                user.subscription_status = "cancelled"
                user.stripe_subscription_id = None
                user.save(
                    update_fields=[
                        "is_subscriber",
                        "subscription_status",
                        "stripe_subscription_id",
                    ]
                )

        elif event_type == "invoice.payment_failed":
            customer_id = _get_value(data_object, "customer")
            user = User.objects.filter(stripe_customer_id=customer_id).first()
            if user:
                user.subscription_status = "lapsed"
                user.is_subscriber = False
                user.save(update_fields=["subscription_status", "is_subscriber"])

        elif event_type == "invoice.payment_succeeded":
            customer_id = _get_value(data_object, "customer")
            user = User.objects.filter(stripe_customer_id=customer_id).first()
            if user:
                extension = timedelta(days=30) if user.subscription_plan == "monthly" else timedelta(days=365)
                today = timezone.now().date()
                base_date = user.subscription_end_date if user.subscription_end_date and user.subscription_end_date > today else today
                user.subscription_end_date = base_date + extension
                if user.subscription_status == "lapsed":
                    user.subscription_status = "active"
                user.is_subscriber = True
                user.save(update_fields=["subscription_end_date", "subscription_status", "is_subscriber"])

        return Response({"received": True}, status=status.HTTP_200_OK)


class ConfirmCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"detail": "Stripe is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        session_id = request.data.get("session_id")
        if not session_id:
            return Response(
                {"detail": "session_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as exc:
            message = getattr(getattr(exc, "error", None), "message", None) or str(exc)
            logger.exception("Stripe checkout confirmation failed for user_id=%s", user.id)
            return Response(
                {"detail": f"Unable to confirm checkout session: {message}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer_id = _get_value(session, "customer")
        metadata = _get_value(session, "metadata", {})
        metadata_user_id = _get_value(metadata, "user_id")

        if metadata_user_id and str(metadata_user_id) != str(user.id):
            return Response(
                {"detail": "This checkout session does not belong to the current user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.stripe_customer_id and customer_id and user.stripe_customer_id != customer_id:
            return Response(
                {"detail": "This checkout session does not match your Stripe customer."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.stripe_customer_id and customer_id:
            user.stripe_customer_id = customer_id
            user.save(update_fields=["stripe_customer_id"])

        session_status = _get_value(session, "status")
        payment_status = _get_value(session, "payment_status")

        if session_status != "complete" or payment_status not in ["paid", "no_payment_required"]:
            return Response(
                {"detail": "Checkout is not completed yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan_name = _get_value(metadata, "plan_name")
        subscription_id = _get_value(session, "subscription")
        _activate_user_subscription(user, plan_name, subscription_id)

        return Response(
            {
                "message": "Subscription confirmed.",
                "is_subscriber": user.is_subscriber,
                "subscription_plan": user.subscription_plan,
                "subscription_status": user.subscription_status,
            },
            status=status.HTTP_200_OK,
        )


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.stripe_subscription_id:
            return Response(
                {"detail": "No active Stripe subscription found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.Subscription.modify(
            user.stripe_subscription_id,
            cancel_at_period_end=True,
        )

        user.subscription_status = "cancelled"
        user.save(update_fields=["subscription_status"])
        return Response(
            {"message": "Subscription cancellation scheduled successfully."},
            status=status.HTTP_200_OK,
        )


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "is_subscriber": user.is_subscriber,
                "subscription_plan": user.subscription_plan,
                "subscription_status": user.subscription_status,
                "subscription_start_date": user.subscription_start_date,
                "subscription_end_date": user.subscription_end_date,
                "stripe_subscription_id": user.stripe_subscription_id,
            },
            status=status.HTTP_200_OK,
        )
