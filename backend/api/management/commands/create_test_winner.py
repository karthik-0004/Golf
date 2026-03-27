from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Draw, DrawEntry, GolfScore, PrizePool, User, Winner


class Command(BaseCommand):
    help = "Create a deterministic test draw with Karthikeyan as a 4-match winner"

    @transaction.atomic
    def handle(self, *args, **options):
        karthik_email = "karthikgangaji@gmail.com"

        try:
            karthik = User.objects.get(email=karthik_email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"User not found: {karthik_email}"))
            return

        # Ensure Karthikeyan is an active subscriber for draw-entry generation.
        if not karthik.is_subscriber or karthik.subscription_status != "active":
            karthik.is_subscriber = True
            karthik.subscription_status = "active"
            if not karthik.subscription_plan:
                karthik.subscription_plan = "monthly"
            karthik.save(update_fields=["is_subscriber", "subscription_status", "subscription_plan", "updated_at"])

        GolfScore.objects.filter(user=karthik).delete()
        karthik_scores = [
            (19, date(2026, 3, 20)),
            (33, date(2026, 3, 21)),
            (27, date(2026, 3, 22)),
            (38, date(2026, 3, 23)),
            (15, date(2026, 3, 24)),
        ]
        for value, played_on in karthik_scores:
            GolfScore.objects.create(user=karthik, score=value, date_played=played_on)

        active_subscribers = list(User.objects.filter(is_subscriber=True, subscription_status="active"))

        Draw.objects.filter(title="April 2026 Test Draw", month=4, year=2026).delete()

        draw = Draw.objects.create(
            title="April 2026 Test Draw",
            month=4,
            year=2026,
            draw_type="random",
            status="pending",
            drawn_numbers=[19, 33, 27, 38, 8],
            jackpot_amount=Decimal("100.00"),
            pool_4_match=Decimal("87.50"),
            pool_3_match=Decimal("62.50"),
            is_jackpot_rolled_over=False,
            rolled_over_amount=Decimal("0.00"),
        )

        PrizePool.objects.create(
            draw=draw,
            total_pool=Decimal("250.00"),
            jackpot_share=Decimal("100.00"),
            four_match_share=Decimal("87.50"),
            three_match_share=Decimal("62.50"),
            subscriber_count=len(active_subscribers),
        )

        for subscriber in active_subscribers:
            scores = GolfScore.objects.filter(user=subscriber).order_by("-date_played")[:5]
            scores_snapshot = [
                {
                    "score": score.score,
                    "date_played": str(score.date_played),
                }
                for score in scores
            ]
            DrawEntry.objects.create(
                draw=draw,
                user=subscriber,
                scores_snapshot=scores_snapshot,
            )

        drawn_set = {19, 33, 27, 38, 8}
        entries = DrawEntry.objects.filter(draw=draw).select_related("user")

        for entry in entries:
            snapshot = entry.scores_snapshot or []
            if snapshot and isinstance(snapshot[0], dict):
                entry_scores = set(int(item["score"]) for item in snapshot if item.get("score") is not None)
            else:
                entry_scores = set(int(value) for value in snapshot if value is not None)

            match_count = len(entry_scores & drawn_set)
            entry.match_count = match_count
            entry.is_winner = match_count >= 3
            entry.save(update_fields=["match_count", "is_winner"])

        Winner.objects.filter(draw=draw).delete()

        karthik_entry = DrawEntry.objects.filter(draw=draw, user=karthik).first()
        if karthik_entry and karthik_entry.match_count == 4:
            Winner.objects.create(
                draw=draw,
                user=karthik,
                match_type="4_match",
                prize_amount=Decimal("87.50"),
                verification_status="pending",
                payment_status="pending",
            )

        draw.status = "published"
        draw.save(update_fields=["status", "updated_at"])

        self.stdout.write(self.style.SUCCESS("✅ Test draw created! Karthikeyan wins 4-match!"))
