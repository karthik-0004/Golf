from decimal import Decimal

from django.contrib.auth.models import AbstractUser, UserManager
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def validate_five_numbers(value):
	if not isinstance(value, list) or len(value) != 5:
		raise ValidationError("This field must contain exactly 5 integers.")
	if any(not isinstance(item, int) for item in value):
		raise ValidationError("All values must be integers.")


class CustomUserManager(UserManager):
	def _create_user(self, email, password, **extra_fields):
		if not email:
			raise ValueError("The email field must be set.")
		email = self.normalize_email(email)
		username = extra_fields.get("username")
		if not username:
			extra_fields["username"] = email.split("@")[0]
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_user(self, email, password=None, **extra_fields):
		extra_fields.setdefault("is_staff", False)
		extra_fields.setdefault("is_superuser", False)
		return self._create_user(email, password, **extra_fields)

	def create_superuser(self, email, password=None, **extra_fields):
		extra_fields.setdefault("is_staff", True)
		extra_fields.setdefault("is_superuser", True)
		if extra_fields.get("is_staff") is not True:
			raise ValueError("Superuser must have is_staff=True.")
		if extra_fields.get("is_superuser") is not True:
			raise ValueError("Superuser must have is_superuser=True.")
		return self._create_user(email, password, **extra_fields)


class Charity(models.Model):
	name = models.CharField(max_length=255)
	slug = models.SlugField(unique=True)
	description = models.TextField()
	logo = models.ImageField(upload_to="charities/logos/", blank=True, null=True)
	banner_image = models.ImageField(
		upload_to="charities/banners/", blank=True, null=True
	)
	website_url = models.URLField(blank=True, null=True)
	is_featured = models.BooleanField(default=False)
	is_active = models.BooleanField(default=True)
	upcoming_events = models.TextField(blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return self.name


class User(AbstractUser):
	SUBSCRIPTION_PLAN_CHOICES = (
		("monthly", "Monthly"),
		("yearly", "Yearly"),
	)
	SUBSCRIPTION_STATUS_CHOICES = (
		("active", "Active"),
		("inactive", "Inactive"),
		("cancelled", "Cancelled"),
		("lapsed", "Lapsed"),
	)

	username = models.CharField(max_length=150, blank=True, null=True)
	email = models.EmailField(unique=True)
	phone_number = models.CharField(max_length=30, blank=True, null=True)
	profile_picture = models.ImageField(
		upload_to="users/profiles/", blank=True, null=True
	)
	is_subscriber = models.BooleanField(default=False)
	subscription_plan = models.CharField(
		max_length=20,
		choices=SUBSCRIPTION_PLAN_CHOICES,
		blank=True,
		null=True,
	)
	subscription_status = models.CharField(
		max_length=20,
		choices=SUBSCRIPTION_STATUS_CHOICES,
		default="inactive",
	)
	subscription_start_date = models.DateField(blank=True, null=True)
	subscription_end_date = models.DateField(blank=True, null=True)
	stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
	stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
	selected_charity = models.ForeignKey(
		Charity,
		on_delete=models.SET_NULL,
		blank=True,
		null=True,
		related_name="selected_users",
	)
	charity_contribution_percentage = models.DecimalField(
		max_digits=5,
		decimal_places=2,
		default=Decimal("10.00"),
		validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	USERNAME_FIELD = "email"
	REQUIRED_FIELDS = ["username"]

	objects = CustomUserManager()

	def __str__(self):
		return self.email


class GolfScore(models.Model):
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="golf_scores")
	score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(45)])
	date_played = models.DateField()
	created_at = models.DateTimeField(auto_now_add=True)

	def save(self, *args, **kwargs):
		super().save(*args, **kwargs)
		queryset = GolfScore.objects.filter(user=self.user).order_by("date_played", "created_at")
		excess_count = queryset.count() - 5
		if excess_count > 0:
			old_ids = list(queryset.values_list("id", flat=True)[:excess_count])
			GolfScore.objects.filter(id__in=old_ids).delete()

	def __str__(self):
		return f"{self.user.email} - {self.score}"


class Draw(models.Model):
	DRAW_TYPE_CHOICES = (
		("random", "Random"),
		("algorithmic", "Algorithmic"),
	)
	STATUS_CHOICES = (
		("pending", "Pending"),
		("simulated", "Simulated"),
		("published", "Published"),
	)

	title = models.CharField(max_length=255)
	month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
	year = models.IntegerField()
	draw_type = models.CharField(max_length=20, choices=DRAW_TYPE_CHOICES)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
	drawn_numbers = models.JSONField(default=list, validators=[validate_five_numbers])
	jackpot_amount = models.DecimalField(max_digits=12, decimal_places=2)
	pool_4_match = models.DecimalField(max_digits=12, decimal_places=2)
	pool_3_match = models.DecimalField(max_digits=12, decimal_places=2)
	is_jackpot_rolled_over = models.BooleanField(default=False)
	rolled_over_amount = models.DecimalField(
		max_digits=12,
		decimal_places=2,
		default=Decimal("0.00"),
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return self.title


class DrawEntry(models.Model):
	draw = models.ForeignKey(Draw, on_delete=models.CASCADE, related_name="entries")
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="draw_entries")
	scores_snapshot = models.JSONField(default=list, validators=[validate_five_numbers])
	match_count = models.IntegerField(blank=True, null=True)
	is_winner = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"{self.user.email} - {self.draw.title}"


class Winner(models.Model):
	MATCH_TYPE_CHOICES = (
		("5_match", "5 Match"),
		("4_match", "4 Match"),
		("3_match", "3 Match"),
	)
	VERIFICATION_STATUS_CHOICES = (
		("pending", "Pending"),
		("approved", "Approved"),
		("rejected", "Rejected"),
	)
	PAYMENT_STATUS_CHOICES = (
		("pending", "Pending"),
		("paid", "Paid"),
	)

	draw = models.ForeignKey(Draw, on_delete=models.CASCADE, related_name="winners")
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wins")
	match_type = models.CharField(max_length=20, choices=MATCH_TYPE_CHOICES)
	prize_amount = models.DecimalField(max_digits=12, decimal_places=2)
	proof_screenshot = models.ImageField(
		upload_to="winners/proofs/", blank=True, null=True
	)
	verification_status = models.CharField(
		max_length=20,
		choices=VERIFICATION_STATUS_CHOICES,
		default="pending",
	)
	payment_status = models.CharField(
		max_length=20,
		choices=PAYMENT_STATUS_CHOICES,
		default="pending",
	)
	admin_notes = models.TextField(blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.user.email} - {self.match_type}"


class SubscriptionPlan(models.Model):
	PLAN_CHOICES = (
		("monthly", "Monthly"),
		("yearly", "Yearly"),
	)

	name = models.CharField(max_length=20, choices=PLAN_CHOICES)
	price = models.DecimalField(max_digits=10, decimal_places=2)
	charity_contribution_amount = models.DecimalField(max_digits=10, decimal_places=2)
	prize_pool_contribution_amount = models.DecimalField(max_digits=10, decimal_places=2)
	stripe_price_id = models.CharField(max_length=255)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def clean(self):
		super().clean()
		if self.price is not None and self.charity_contribution_amount is not None:
			minimum = self.price * Decimal("0.10")
			if self.charity_contribution_amount < minimum:
				raise ValidationError(
					{
						"charity_contribution_amount": (
							"Charity contribution amount must be at least 10% of price."
						)
					}
				)

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)

	def __str__(self):
		return self.name


class PrizePool(models.Model):
	draw = models.OneToOneField(Draw, on_delete=models.CASCADE, related_name="prize_pool")
	total_pool = models.DecimalField(max_digits=12, decimal_places=2)
	jackpot_share = models.DecimalField(max_digits=12, decimal_places=2)
	four_match_share = models.DecimalField(max_digits=12, decimal_places=2)
	three_match_share = models.DecimalField(max_digits=12, decimal_places=2)
	subscriber_count = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Prize Pool - {self.draw.title}"
