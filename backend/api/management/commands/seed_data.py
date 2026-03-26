from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import Charity, Draw, DrawEntry, GolfScore, PrizePool, SubscriptionPlan, Winner


class Command(BaseCommand):
    help = "Populate database with realistic test data for development"

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        User = get_user_model()

        # 1) Subscription plans
        plan_payloads = [
            {
                "name": "monthly",
                "price": Decimal("9.99"),
                "charity_contribution_amount": Decimal("1.00"),
                "prize_pool_contribution_amount": Decimal("6.49"),
                "stripe_price_id": "price_monthly_test",
                "is_active": True,
            },
            {
                "name": "yearly",
                "price": Decimal("99.99"),
                "charity_contribution_amount": Decimal("10.00"),
                "prize_pool_contribution_amount": Decimal("64.99"),
                "stripe_price_id": "price_yearly_test",
                "is_active": True,
            },
        ]

        created_plans = 0
        for payload in plan_payloads:
            _, created = SubscriptionPlan.objects.update_or_create(
                name=payload["name"],
                defaults=payload,
            )
            if created:
                created_plans += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Step 1 complete: subscription plans ready ({SubscriptionPlan.objects.count()} total, {created_plans} created this run)."
            )
        )

        # 2) Charities
        charity_payloads = [
            {
                "name": "Children's Golf Foundation",
                "slug": "childrens-golf-foundation",
                "description": (
                    "We introduce underprivileged children to the game of golf, providing equipment, "
                    "coaching, and access to courses that would otherwise be out of reach. Every round "
                    "you play helps a child discover a lifelong sport."
                ),
                "website_url": "https://example.com/cgf",
                "is_featured": True,
                "is_active": True,
                "upcoming_events": (
                    "Junior Golf Day - 20th April 2026 at Wentworth Club. Open to all members."
                ),
            },
            {
                "name": "Veterans on the Fairway",
                "slug": "veterans-on-the-fairway",
                "description": (
                    "Golf therapy for military veterans recovering from physical and mental health "
                    "challenges. We use the course as a place of healing, camaraderie, and purpose "
                    "for those who served."
                ),
                "website_url": "https://example.com/votf",
                "is_featured": True,
                "is_active": True,
                "upcoming_events": (
                    "Veterans Golf Day - 10th May 2026. All Digital Heroes members welcome."
                ),
            },
            {
                "name": "Junior Golf Academy",
                "slug": "junior-golf-academy",
                "description": (
                    "Developing the next generation of golfers through structured coaching programmes, "
                    "school partnerships, and county-level tournaments. Your contribution funds "
                    "coaching sessions directly."
                ),
                "website_url": "https://example.com/jga",
                "is_featured": False,
                "is_active": True,
                "upcoming_events": "",
            },
            {
                "name": "Golf for Good",
                "slug": "golf-for-good",
                "description": (
                    "A grassroots charity using golf to tackle social isolation in elderly communities. "
                    "Weekly social rounds, transport assistance, and clubhouse access programmes across "
                    "the UK."
                ),
                "website_url": "https://example.com/gfg",
                "is_featured": False,
                "is_active": True,
                "upcoming_events": "",
            },
            {
                "name": "Green Fairways Trust",
                "slug": "green-fairways-trust",
                "description": (
                    "Environmental charity maintaining and restoring natural habitats on and around golf "
                    "courses across the UK. We plant trees, protect wildlife corridors, and promote "
                    "sustainable course management."
                ),
                "website_url": "https://example.com/gft",
                "is_featured": False,
                "is_active": True,
                "upcoming_events": "Tree Planting Day - 5th April 2026.",
            },
        ]

        created_charities = 0
        for payload in charity_payloads:
            _, created = Charity.objects.update_or_create(
                slug=payload["slug"],
                defaults=payload,
            )
            if created:
                created_charities += 1

        first_charity = Charity.objects.get(slug="childrens-golf-foundation")

        self.stdout.write(
            self.style.SUCCESS(
                f"Step 2 complete: charities ready ({Charity.objects.count()} total, {created_charities} created this run)."
            )
        )

        # 3) Users
        admin_defaults = {
            "username": "admin",
            "first_name": "Admin",
            "last_name": "User",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        }
        admin_user, admin_created = User.objects.get_or_create(
            email="admin@test.com",
            defaults=admin_defaults,
        )
        if not admin_created:
            changed = False
            for field, value in admin_defaults.items():
                if getattr(admin_user, field) != value:
                    setattr(admin_user, field, value)
                    changed = True
            if changed:
                admin_user.save()
        admin_user.set_password("admin123")
        admin_user.save(update_fields=["password"])

        monthly_plan = SubscriptionPlan.objects.get(name="monthly")
        subscriber_defaults = {
            "username": "testuser",
            "first_name": "John",
            "last_name": "Golfer",
            "is_subscriber": True,
            "subscription_plan": monthly_plan.name,
            "subscription_status": "active",
            "subscription_start_date": today,
            "subscription_end_date": today + timedelta(days=30),
            "stripe_customer_id": "cus_test_123",
            "stripe_subscription_id": "sub_test_123",
            "selected_charity": first_charity,
            "charity_contribution_percentage": Decimal("10.00"),
            "is_active": True,
        }
        subscriber, subscriber_created = User.objects.get_or_create(
            email="user@test.com",
            defaults=subscriber_defaults,
        )
        if not subscriber_created:
            changed = False
            for field, value in subscriber_defaults.items():
                if getattr(subscriber, field) != value:
                    setattr(subscriber, field, value)
                    changed = True
            if changed:
                subscriber.save()
        subscriber.set_password("test1234")
        subscriber.save(update_fields=["password"])

        self.stdout.write(
            self.style.SUCCESS(
                "Step 3 complete: users ready (admin@test.com and user@test.com ensured)."
            )
        )

        # 4) Golf scores
        score_points = [
            (32, 1),
            (28, 5),
            (35, 10),
            (22, 15),
            (40, 20),
        ]
        expected_score_dates = {today - timedelta(days=days) for _, days in score_points}

        # Clear existing subscriber scores to ensure deterministic seed data.
        GolfScore.objects.filter(user=subscriber).exclude(date_played__in=expected_score_dates).delete()

        created_scores = 0
        for score_value, days in score_points:
            date_played = today - timedelta(days=days)
            _, created = GolfScore.objects.update_or_create(
                user=subscriber,
                date_played=date_played,
                defaults={"score": score_value},
            )
            if created:
                created_scores += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Step 4 complete: golf scores ready ({subscriber.golf_scores.count()} total for user, {created_scores} created this run)."
            )
        )

        # 5) Draw, prize pool, draw entry, winner
        draw_defaults = {
            "draw_type": "random",
            "status": "published",
            "drawn_numbers": [22, 28, 32, 15, 40],
            "jackpot_amount": Decimal("1712.00"),
            "pool_4_match": Decimal("1498.00"),
            "pool_3_match": Decimal("1070.00"),
            "is_jackpot_rolled_over": False,
            "rolled_over_amount": Decimal("0.00"),
        }
        draw, draw_created = Draw.objects.update_or_create(
            title="March 2026 Draw",
            month=3,
            year=2026,
            defaults=draw_defaults,
        )

        prize_pool_defaults = {
            "total_pool": Decimal("4280.00"),
            "jackpot_share": Decimal("1712.00"),
            "four_match_share": Decimal("1498.00"),
            "three_match_share": Decimal("1070.00"),
            "subscriber_count": 247,
        }
        _, prize_pool_created = PrizePool.objects.update_or_create(
            draw=draw,
            defaults=prize_pool_defaults,
        )

        scores_snapshot = [
            {"score": 32, "date_played": "today-1"},
            {"score": 28, "date_played": "today-5"},
            {"score": 35, "date_played": "today-10"},
            {"score": 22, "date_played": "today-15"},
            {"score": 40, "date_played": "today-20"},
        ]
        _, entry_created = DrawEntry.objects.update_or_create(
            draw=draw,
            user=subscriber,
            defaults={
                "scores_snapshot": scores_snapshot,
                "match_count": 4,
                "is_winner": True,
            },
        )

        _, winner_created = Winner.objects.update_or_create(
            draw=draw,
            user=subscriber,
            match_type="4_match",
            defaults={
                "prize_amount": Decimal("1498.00"),
                "verification_status": "pending",
                "payment_status": "pending",
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Step 5 complete: draw, prize pool, draw entry, and winner ready "
                f"(draw {'created' if draw_created else 'updated'}, "
                f"prize pool {'created' if prize_pool_created else 'updated'}, "
                f"entry {'created' if entry_created else 'updated'}, "
                f"winner {'created' if winner_created else 'updated'})."
            )
        )

        # 6) Final verification output
        verification = {
            "subscription_plans": SubscriptionPlan.objects.count(),
            "charities": Charity.objects.count(),
            "users": User.objects.count(),
            "subscriber_scores": GolfScore.objects.filter(user=subscriber).count(),
            "draws": Draw.objects.count(),
            "prize_pools": PrizePool.objects.count(),
            "draw_entries": DrawEntry.objects.count(),
            "winners": Winner.objects.count(),
        }

        self.stdout.write(self.style.SUCCESS("Step 6 complete: seed finished successfully."))
        self.stdout.write(self.style.SUCCESS(f"Verification counts: {verification}"))
