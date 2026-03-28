from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Update Stripe price IDs for monthly and yearly subscription plans"

    def handle(self, *args, **options):
        monthly_price_id = settings.STRIPE_PRICE_ID_MONTHLY
        yearly_price_id = settings.STRIPE_PRICE_ID_YEARLY

        if not monthly_price_id or not yearly_price_id:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping Stripe plan update because STRIPE_PRICE_ID_MONTHLY or STRIPE_PRICE_ID_YEARLY is missing."
                )
            )
            return

        try:
            monthly = SubscriptionPlan.objects.get(name="monthly")
            monthly.stripe_price_id = monthly_price_id
            monthly.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Monthly plan updated with price ID: {monthly.stripe_price_id}"
                )
            )
        except SubscriptionPlan.DoesNotExist:
            self.stdout.write(self.style.ERROR("Monthly subscription plan does not exist."))

        try:
            yearly = SubscriptionPlan.objects.get(name="yearly")
            yearly.stripe_price_id = yearly_price_id
            yearly.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Yearly plan updated with price ID: {yearly.stripe_price_id}"
                )
            )
        except SubscriptionPlan.DoesNotExist:
            self.stdout.write(self.style.ERROR("Yearly subscription plan does not exist."))