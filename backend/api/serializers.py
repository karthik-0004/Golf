from decimal import Decimal

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers

from .models import Charity, Draw, DrawEntry, GolfScore, PrizePool, SubscriptionPlan, User, Winner


class CharityBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charity
        fields = ["id", "name"]


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
            "username",
        ]

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Password and confirm_password must match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, is_subscriber=False, **validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(email=email, password=password)
        if user is None:
            user = authenticate(username=email, password=password)

        if user is None:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("User account is inactive.")

        attrs["user"] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    selected_charity = CharityBasicSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "username",
            "phone_number",
            "profile_picture",
            "is_subscriber",
            "subscription_plan",
            "subscription_status",
            "subscription_start_date",
            "subscription_end_date",
            "selected_charity",
            "charity_contribution_percentage",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_subscriber",
            "subscription_plan",
            "subscription_status",
            "created_at",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "username",
            "phone_number",
            "profile_picture",
            "charity_contribution_percentage",
        ]

    def validate_charity_contribution_percentage(self, value):
        if value < Decimal("10.00") or value > Decimal("100.00"):
            raise serializers.ValidationError(
                "Charity contribution percentage must be between 10 and 100."
            )
        return value


class CharityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charity
        fields = ["id", "name", "slug", "description", "logo", "is_featured", "is_active"]


class CharityDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charity
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "banner_image",
            "website_url",
            "is_featured",
            "is_active",
            "upcoming_events",
            "created_at",
            "updated_at",
        ]


class GolfScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = GolfScore
        fields = ["id", "score", "date_played", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_score(self, value):
        if value < 1 or value > 45:
            raise serializers.ValidationError("Score must be between 1 and 45.")
        return value


class DrawSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draw
        fields = [
            "id",
            "title",
            "month",
            "year",
            "draw_type",
            "status",
            "drawn_numbers",
            "jackpot_amount",
            "pool_4_match",
            "pool_3_match",
            "is_jackpot_rolled_over",
            "rolled_over_amount",
            "created_at",
        ]


class WinnerSerializer(serializers.ModelSerializer):
    draw = DrawSerializer(read_only=True)

    class Meta:
        model = Winner
        fields = [
            "id",
            "draw",
            "match_type",
            "prize_amount",
            "verification_status",
            "payment_status",
            "proof_screenshot",
            "created_at",
        ]


class DrawEntrySerializer(serializers.ModelSerializer):
    draw = DrawSerializer(read_only=True)

    class Meta:
        model = DrawEntry
        fields = [
            "id",
            "draw",
            "scores_snapshot",
            "match_count",
            "is_winner",
            "created_at",
        ]


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "price",
            "charity_contribution_amount",
            "prize_pool_contribution_amount",
            "stripe_price_id",
            "is_active",
        ]


class CreateSubscriptionSerializer(serializers.Serializer):
    PLAN_CHOICES = (
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    )
    plan_name = serializers.ChoiceField(choices=PLAN_CHOICES)


class WebhookSerializer(serializers.Serializer):
    pass


class PrizePoolSerializer(serializers.ModelSerializer):
    draw = DrawSerializer(read_only=True)

    class Meta:
        model = PrizePool
        fields = [
            "id",
            "draw",
            "total_pool",
            "jackpot_share",
            "four_match_share",
            "three_match_share",
            "subscriber_count",
            "created_at",
        ]


class DrawEntryUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name"]


class DrawEntryDetailSerializer(serializers.ModelSerializer):
    user = DrawEntryUserSerializer(read_only=True)
    draw = DrawSerializer(read_only=True)

    class Meta:
        model = DrawEntry
        fields = [
            "id",
            "user",
            "draw",
            "scores_snapshot",
            "match_count",
            "is_winner",
            "created_at",
        ]


class WinnerUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class WinnerDetailSerializer(serializers.ModelSerializer):
    draw = DrawSerializer(read_only=True)
    user = WinnerUserSerializer(read_only=True)

    class Meta:
        model = Winner
        fields = [
            "id",
            "draw",
            "user",
            "match_type",
            "prize_amount",
            "verification_status",
            "payment_status",
            "proof_screenshot",
            "admin_notes",
            "created_at",
            "updated_at",
        ]


class WinnerProofUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Winner
        fields = ["proof_screenshot"]

    def validate_proof_screenshot(self, value):
        max_size = 5 * 1024 * 1024
        content_type = getattr(value, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("File must be an image.")
        if value.size > max_size:
            raise serializers.ValidationError("Image size must be 5MB or less.")
        return value


class AdminDrawConfigSerializer(serializers.Serializer):
    DRAW_TYPE_CHOICES = (
        ("random", "Random"),
        ("algorithmic", "Algorithmic"),
    )

    title = serializers.CharField(max_length=255)
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField()
    draw_type = serializers.ChoiceField(choices=DRAW_TYPE_CHOICES)

    def validate_year(self, value):
        current_year = timezone.now().year
        if value < current_year:
            raise serializers.ValidationError("Year must be greater than or equal to current year.")
        return value