from django.core.management.base import BaseCommand

from api.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Update Stripe price IDs for monthly and yearly subscription plans"

    def handle(self, *args, **options):
        try:
            monthly = SubscriptionPlan.objects.get(name="monthly")
            monthly.stripe_price_id = "price_1TFHGtJCN3dCUx2bY17q5b5q"
            monthly.save()
            print(f"✅ Monthly plan updated with price ID: {monthly.stripe_price_id}")
        except SubscriptionPlan.DoesNotExist:
            print("Error: Monthly subscription plan does not exist.")

        try:
            yearly = SubscriptionPlan.objects.get(name="yearly")
            yearly.stripe_price_id = "price_1TFHN3JCN3dCUx2bukg2T87L"
            yearly.save()
            print(f"✅ Yearly plan updated with price ID: {yearly.stripe_price_id}")
        except SubscriptionPlan.DoesNotExist:
            print("Error: Yearly subscription plan does not exist.")