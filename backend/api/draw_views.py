import random
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Charity, Draw, DrawEntry, GolfScore, PrizePool, SubscriptionPlan, User, Winner
from .serializers import (
    AdminDrawConfigSerializer,
    CharityDetailSerializer,
    DrawEntryDetailSerializer,
    DrawSerializer,
    GolfScoreSerializer,
    PrizePoolSerializer,
    UserProfileSerializer,
    WinnerDetailSerializer,
    WinnerProofUploadSerializer,
)


def _quantize_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _active_subscribers_queryset():
    return User.objects.filter(is_subscriber=True, subscription_status="active")


def _snapshot_scores_for_user(user):
    scores = user.golf_scores.order_by("-date_played", "-created_at")[:5]
    return [
        {"score": score.score, "date_played": score.date_played.isoformat()}
        for score in scores
    ]


def _extract_snapshot_values(scores_snapshot):
    values = []
    for item in scores_snapshot:
        if isinstance(item, dict) and "score" in item:
            values.append(int(item["score"]))
        elif isinstance(item, int):
            values.append(int(item))
    return values


def _get_previous_month(month, year):
    if month == 1:
        return 12, year - 1
    return month - 1, year


def _calculate_total_pool(subscribers):
    plan_map = {
        plan.name: plan
        for plan in SubscriptionPlan.objects.filter(is_active=True)
    }
    total = Decimal("0.00")
    for subscriber in subscribers:
        plan = plan_map.get(subscriber.subscription_plan)
        if plan:
            total += plan.prize_pool_contribution_amount
    return _quantize_money(total)


def _draw_weighted_unique_scores(active_subscribers):
    scores = list(
        GolfScore.objects.filter(user__in=active_subscribers)
        .values_list("score", flat=True)
    )
    if not scores:
        return random.sample(range(1, 46), 5)

    counter = Counter(scores)
    candidates = list(range(1, 46))
    selected = []

    while len(selected) < 5 and candidates:
        weights = [counter.get(num, 0) for num in candidates]
        if sum(weights) == 0:
            selected.extend(random.sample(candidates, min(5 - len(selected), len(candidates))))
            break
        picked = random.choices(candidates, weights=weights, k=1)[0]
        selected.append(picked)
        candidates.remove(picked)

    if len(selected) < 5:
        remaining = [num for num in range(1, 46) if num not in selected]
        selected.extend(random.sample(remaining, 5 - len(selected)))

    return selected[:5]


class CurrentDrawView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        draw = Draw.objects.filter(status="published").order_by("-year", "-month", "-created_at").first()
        if not draw:
            return Response({"detail": "No published draw found."}, status=status.HTTP_404_NOT_FOUND)

        draw_data = DrawSerializer(draw).data
        prize_pool = getattr(draw, "prize_pool", None)
        draw_data["prize_pool"] = PrizePoolSerializer(prize_pool).data if prize_pool else None
        return Response(draw_data, status=status.HTTP_200_OK)


class DrawHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Draw.objects.filter(status="published").order_by("-year", "-month")
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = DrawSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class UserDrawEntriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = DrawEntry.objects.filter(user=request.user).select_related("draw", "user").order_by("-created_at")
        serializer = DrawEntryDetailSerializer(entries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserWinningsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        winnings = Winner.objects.filter(user=request.user).select_related("draw", "user").order_by("-created_at")
        total_won = winnings.filter(payment_status="paid").aggregate(total=Sum("prize_amount")).get("total") or Decimal("0.00")
        serializer = WinnerDetailSerializer(winnings, many=True)
        return Response(
            {"total_won": _quantize_money(total_won), "winnings": serializer.data},
            status=status.HTTP_200_OK,
        )


class UploadWinnerProofView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        winner = get_object_or_404(Winner, pk=pk, user=request.user)
        if winner.verification_status != "pending":
            return Response(
                {"detail": "Proof can only be uploaded while verification status is pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = WinnerProofUploadSerializer(winner, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(WinnerDetailSerializer(winner).data, status=status.HTTP_200_OK)


class AdminDrawListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        draws = Draw.objects.all().order_by("-created_at")
        serializer = DrawSerializer(draws, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        serializer = AdminDrawConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        active_subscribers = list(_active_subscribers_queryset())
        active_subscriber_count = len(active_subscribers)
        total_pool = _calculate_total_pool(active_subscribers)

        jackpot_share = _quantize_money(total_pool * Decimal("0.40"))
        four_match_share = _quantize_money(total_pool * Decimal("0.35"))
        three_match_share = _quantize_money(total_pool * Decimal("0.25"))

        rolled_over_amount = Decimal("0.00")
        is_rolled_over = False
        previous_month, previous_year = _get_previous_month(payload["month"], payload["year"])
        previous_draw = Draw.objects.filter(
            month=previous_month,
            year=previous_year,
            status__in=["simulated", "published"],
        ).order_by("-created_at").first()

        if previous_draw and not Winner.objects.filter(draw=previous_draw, match_type="5_match").exists():
            previous_prize_pool = getattr(previous_draw, "prize_pool", None)
            if previous_prize_pool and previous_prize_pool.jackpot_share:
                rolled_over_amount = _quantize_money(previous_prize_pool.jackpot_share)
                jackpot_share = _quantize_money(jackpot_share + rolled_over_amount)
                is_rolled_over = True

        draw = Draw.objects.create(
            title=payload["title"],
            month=payload["month"],
            year=payload["year"],
            draw_type=payload["draw_type"],
            status="pending",
            drawn_numbers=[1, 2, 3, 4, 5],
            jackpot_amount=jackpot_share,
            pool_4_match=four_match_share,
            pool_3_match=three_match_share,
            is_jackpot_rolled_over=is_rolled_over,
            rolled_over_amount=rolled_over_amount,
        )

        PrizePool.objects.create(
            draw=draw,
            total_pool=total_pool,
            jackpot_share=jackpot_share,
            four_match_share=four_match_share,
            three_match_share=three_match_share,
            subscriber_count=active_subscriber_count,
        )

        for subscriber in active_subscribers:
            DrawEntry.objects.create(
                draw=draw,
                user=subscriber,
                scores_snapshot=_snapshot_scores_for_user(subscriber),
            )

        draw_data = DrawSerializer(draw).data
        draw_data["prize_pool"] = PrizePoolSerializer(draw.prize_pool).data
        draw_data["entries_created"] = DrawEntry.objects.filter(draw=draw).count()
        return Response(draw_data, status=status.HTTP_201_CREATED)


class AdminRunDrawView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request, pk):
        draw = get_object_or_404(Draw, pk=pk)
        if draw.status not in ["pending", "simulated"]:
            return Response(
                {"detail": "Draw can only be run when status is pending or simulated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_subscribers = list(_active_subscribers_queryset())

        if draw.draw_type == "random":
            drawn_numbers = random.sample(range(1, 46), 5)
        else:
            drawn_numbers = _draw_weighted_unique_scores(active_subscribers)

        draw.drawn_numbers = drawn_numbers

        entries = DrawEntry.objects.filter(draw=draw).select_related("user")
        for entry in entries:
            snapshot_values = _extract_snapshot_values(entry.scores_snapshot)
            match_count = sum(1 for score in snapshot_values if score in drawn_numbers)
            entry.match_count = match_count
            entry.is_winner = match_count >= 3
            entry.save(update_fields=["match_count", "is_winner"])

        Winner.objects.filter(draw=draw).delete()

        winners_by_match = {
            5: list(DrawEntry.objects.filter(draw=draw, match_count=5, is_winner=True)),
            4: list(DrawEntry.objects.filter(draw=draw, match_count=4, is_winner=True)),
            3: list(DrawEntry.objects.filter(draw=draw, match_count=3, is_winner=True)),
        }

        prize_pool = getattr(draw, "prize_pool", None)
        if not prize_pool:
            return Response({"detail": "Prize pool is missing for this draw."}, status=status.HTTP_400_BAD_REQUEST)

        def distribute(entries_list, match_type, amount_pool):
            if not entries_list:
                return
            prize_amount = _quantize_money(Decimal(amount_pool) / Decimal(len(entries_list)))
            Winner.objects.bulk_create(
                [
                    Winner(
                        draw=draw,
                        user=entry.user,
                        match_type=match_type,
                        prize_amount=prize_amount,
                    )
                    for entry in entries_list
                ]
            )

        distribute(winners_by_match[5], "5_match", prize_pool.jackpot_share)
        distribute(winners_by_match[4], "4_match", prize_pool.four_match_share)
        distribute(winners_by_match[3], "3_match", prize_pool.three_match_share)

        if not winners_by_match[5]:
            draw.is_jackpot_rolled_over = True
            draw.rolled_over_amount = _quantize_money(prize_pool.jackpot_share)

        draw.status = "simulated"
        draw.save(update_fields=["drawn_numbers", "is_jackpot_rolled_over", "rolled_over_amount", "status", "updated_at"])

        summary = {
            "draw": DrawSerializer(draw).data,
            "winner_summary": {
                "5_match": len(winners_by_match[5]),
                "4_match": len(winners_by_match[4]),
                "3_match": len(winners_by_match[3]),
                "total_winners": sum(len(v) for v in winners_by_match.values()),
            },
        }
        return Response(summary, status=status.HTTP_200_OK)


class AdminDrawPublishView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        draw = get_object_or_404(Draw, pk=pk)
        if draw.status != "simulated":
            return Response(
                {"detail": "Only simulated draws can be published."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        draw.status = "published"
        draw.save(update_fields=["status", "updated_at"])
        return Response({"message": "Draw published successfully."}, status=status.HTTP_200_OK)


class AdminWinnersListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        winners = Winner.objects.select_related("draw", "user").all().order_by("-created_at")

        verification_status = request.query_params.get("verification_status")
        payment_status = request.query_params.get("payment_status")
        draw_id = request.query_params.get("draw_id")

        if verification_status:
            winners = winners.filter(verification_status=verification_status)
        if payment_status:
            winners = winners.filter(payment_status=payment_status)
        if draw_id:
            winners = winners.filter(draw_id=draw_id)

        serializer = WinnerDetailSerializer(winners, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminVerifyWinnerView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        winner = get_object_or_404(Winner, pk=pk)
        action = request.data.get("action")
        admin_notes = request.data.get("admin_notes")

        if action not in ["approve", "reject"]:
            return Response(
                {"detail": "Action must be either 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        winner.verification_status = "approved" if action == "approve" else "rejected"
        if action == "approve":
            winner.payment_status = "pending"
        winner.admin_notes = admin_notes
        winner.save(update_fields=["verification_status", "payment_status", "admin_notes", "updated_at"])

        return Response(WinnerDetailSerializer(winner).data, status=status.HTTP_200_OK)


class AdminMarkPaidView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        winner = get_object_or_404(Winner, pk=pk)
        if winner.verification_status != "approved":
            return Response(
                {"detail": "Winner must be approved before marking as paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        winner.payment_status = "paid"
        winner.save(update_fields=["payment_status", "updated_at"])
        return Response(WinnerDetailSerializer(winner).data, status=status.HTTP_200_OK)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all()
        active_subscribers = users.filter(is_subscriber=True, subscription_status="active")

        total_prize_pool = PrizePool.objects.aggregate(total=Sum("total_pool")).get("total") or Decimal("0.00")
        total_paid_out = Winner.objects.filter(payment_status="paid").aggregate(total=Sum("prize_amount")).get("total") or Decimal("0.00")

        plan_map = {
            plan.name: plan
            for plan in SubscriptionPlan.objects.filter(is_active=True)
        }
        total_charity_contributions = Decimal("0.00")
        for subscriber in active_subscribers:
            plan = plan_map.get(subscriber.subscription_plan)
            if not plan:
                continue
            contribution = plan.price * (subscriber.charity_contribution_percentage / Decimal("100"))
            total_charity_contributions += contribution

        analytics = {
            "total_users": users.count(),
            "active_subscribers": active_subscribers.count(),
            "total_prize_pool": _quantize_money(total_prize_pool),
            "total_charity_contributions": _quantize_money(total_charity_contributions),
            "total_draws": Draw.objects.count(),
            "published_draws": Draw.objects.filter(status="published").count(),
            "total_winners": Winner.objects.count(),
            "total_paid_out": _quantize_money(total_paid_out),
        }
        return Response(analytics, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by("-created_at")
        is_subscriber = request.query_params.get("is_subscriber")
        subscription_status = request.query_params.get("subscription_status")
        search = request.query_params.get("search")

        if is_subscriber is not None:
            if is_subscriber.lower() in ["true", "1"]:
                users = users.filter(is_subscriber=True)
            elif is_subscriber.lower() in ["false", "0"]:
                users = users.filter(is_subscriber=False)

        if subscription_status:
            users = users.filter(subscription_status=subscription_status)

        if search:
            users = users.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        serializer = UserProfileSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        allowed_fields = {
            "first_name",
            "last_name",
            "subscription_status",
            "is_subscriber",
            "charity_contribution_percentage",
        }
        payload = {k: v for k, v in request.data.items() if k in allowed_fields}

        if "charity_contribution_percentage" in payload:
            value = Decimal(str(payload["charity_contribution_percentage"]))
            if value < Decimal("0") or value > Decimal("100"):
                return Response(
                    {"detail": "charity_contribution_percentage must be between 0 and 100."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payload["charity_contribution_percentage"] = value

        for field, value in payload.items():
            setattr(user, field, value)

        user.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_200_OK)


class AdminUserScoresView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        scores = GolfScore.objects.filter(user=user).order_by("-date_played", "-created_at")
        serializer = GolfScoreSerializer(scores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = GolfScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        score_id = request.data.get("score_id")
        if not score_id:
            return Response({"detail": "score_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        score = get_object_or_404(GolfScore, pk=score_id, user=user)
        score.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCharityView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        charities = Charity.objects.all().order_by("name")
        serializer = CharityDetailSerializer(charities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CharityDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCharityDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        charity = get_object_or_404(Charity, pk=pk)
        serializer = CharityDetailSerializer(charity)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        charity = get_object_or_404(Charity, pk=pk)
        serializer = CharityDetailSerializer(charity, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        charity = get_object_or_404(Charity, pk=pk)
        charity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
