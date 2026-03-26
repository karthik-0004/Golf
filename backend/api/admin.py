from django.contrib import admin
from .models import (
	Charity,
	Draw,
	DrawEntry,
	GolfScore,
	PrizePool,
	SubscriptionPlan,
	User,
	Winner,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
	list_display = ("email", "username", "is_subscriber", "subscription_status", "created_at")
	search_fields = ("email", "username", "first_name", "last_name")
	list_filter = ("is_subscriber", "subscription_status", "subscription_plan")


@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
	list_display = ("name", "slug", "is_featured", "is_active", "created_at")
	search_fields = ("name", "slug")
	list_filter = ("is_featured", "is_active")


@admin.register(GolfScore)
class GolfScoreAdmin(admin.ModelAdmin):
	list_display = ("user", "score", "date_played", "created_at")
	search_fields = ("user__email", "user__username")
	list_filter = ("date_played",)


@admin.register(Draw)
class DrawAdmin(admin.ModelAdmin):
	list_display = ("title", "month", "year", "draw_type", "status", "created_at")
	search_fields = ("title",)
	list_filter = ("draw_type", "status", "month", "year")


@admin.register(DrawEntry)
class DrawEntryAdmin(admin.ModelAdmin):
	list_display = ("draw", "user", "match_count", "is_winner", "created_at")
	search_fields = ("draw__title", "user__email")
	list_filter = ("is_winner",)


@admin.register(Winner)
class WinnerAdmin(admin.ModelAdmin):
	list_display = (
		"draw",
		"user",
		"match_type",
		"prize_amount",
		"verification_status",
		"payment_status",
		"created_at",
	)
	search_fields = ("draw__title", "user__email")
	list_filter = ("match_type", "verification_status", "payment_status")


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
	list_display = (
		"name",
		"price",
		"charity_contribution_amount",
		"prize_pool_contribution_amount",
		"is_active",
		"created_at",
	)
	list_filter = ("name", "is_active")


@admin.register(PrizePool)
class PrizePoolAdmin(admin.ModelAdmin):
	list_display = (
		"draw",
		"total_pool",
		"jackpot_share",
		"four_match_share",
		"three_match_share",
		"subscriber_count",
		"created_at",
	)
