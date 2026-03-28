from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import Charity, GolfScore, User
from .serializers import (
	CharityDetailSerializer,
	CharityListSerializer,
	GolfScoreSerializer,
	UserLoginSerializer,
	UserProfileSerializer,
	UserRegisterSerializer,
	UserUpdateSerializer,
)


class RegisterView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = UserRegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()

		refresh = RefreshToken.for_user(user)
		profile_data = UserProfileSerializer(user, context={"request": request}).data
		return Response(
			{
				"message": "User registered successfully.",
				"tokens": {
					"refresh": str(refresh),
					"access": str(refresh.access_token),
				},
				"user": profile_data,
			},
			status=status.HTTP_201_CREATED,
		)


class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = UserLoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.validated_data["user"]

		refresh = RefreshToken.for_user(user)
		profile_data = UserProfileSerializer(user, context={"request": request}).data
		return Response(
			{
				"message": "Login successful.",
				"tokens": {
					"refresh": str(refresh),
					"access": str(refresh.access_token),
				},
				"user": profile_data,
			},
			status=status.HTTP_200_OK,
		)


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		refresh_token = request.data.get("refresh")
		if not refresh_token:
			return Response(
				{"detail": "refresh token is required."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			token = RefreshToken(refresh_token)
			token.blacklist()
		except TokenError:
			return Response(
				{"detail": "Invalid or expired refresh token."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)


class UserProfileView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		user = User.objects.select_related("selected_charity").get(pk=request.user.pk)
		serializer = UserProfileSerializer(user, context={"request": request})
		return Response(serializer.data, status=status.HTTP_200_OK)

	def put(self, request):
		user = User.objects.select_related("selected_charity").get(pk=request.user.pk)
		serializer = UserUpdateSerializer(user, data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		profile = UserProfileSerializer(user, context={"request": request})
		return Response(profile.data, status=status.HTTP_200_OK)

	def patch(self, request):
		user = User.objects.select_related("selected_charity").get(pk=request.user.pk)
		serializer = UserUpdateSerializer(user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		profile = UserProfileSerializer(user, context={"request": request})
		return Response(profile.data, status=status.HTTP_200_OK)


class CharityListView(generics.ListAPIView):
	permission_classes = [AllowAny]
	serializer_class = CharityListSerializer
	filter_backends = [filters.SearchFilter]
	search_fields = ["name"]

	def get_queryset(self):
		return Charity.objects.filter(is_active=True).order_by("name")


class CharityDetailView(generics.RetrieveAPIView):
	permission_classes = [AllowAny]
	serializer_class = CharityDetailSerializer
	queryset = Charity.objects.filter(is_active=True)
	lookup_field = "slug"


class SelectCharityView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		charity_id = request.data.get("charity_id")
		if not charity_id:
			return Response(
				{"detail": "charity_id is required."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		charity = get_object_or_404(Charity, id=charity_id, is_active=True)
		request.user.selected_charity = charity

		contribution = request.data.get("charity_contribution_percentage")
		if contribution is not None:
			try:
				contribution_value = Decimal(str(contribution))
			except Exception:
				return Response(
					{"detail": "charity_contribution_percentage must be a valid number."},
					status=status.HTTP_400_BAD_REQUEST,
				)

			if contribution_value < Decimal("10") or contribution_value > Decimal("100"):
				return Response(
					{
						"detail": "charity_contribution_percentage must be between 10 and 100."
					},
					status=status.HTTP_400_BAD_REQUEST,
				)
			request.user.charity_contribution_percentage = contribution_value

		request.user.save(update_fields=["selected_charity", "charity_contribution_percentage"])

		profile = UserProfileSerializer(request.user, context={"request": request})
		return Response(
			{"message": "Charity selected successfully.", "user": profile.data},
			status=status.HTTP_200_OK,
		)


class GolfScoreListCreateView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		scores = GolfScore.objects.filter(user=request.user).order_by("-date_played")
		serializer = GolfScoreSerializer(scores, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)

	def post(self, request):
		serializer = GolfScoreSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(user=request.user)
		return Response(serializer.data, status=status.HTTP_201_CREATED)


class GolfScoreUpdateDeleteView(APIView):
	permission_classes = [IsAuthenticated]

	def get_object(self, user, pk):
		return get_object_or_404(GolfScore, pk=pk, user=user)

	def put(self, request, pk):
		score = self.get_object(request.user, pk)
		serializer = GolfScoreSerializer(score, data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)

	def patch(self, request, pk):
		score = self.get_object(request.user, pk)
		serializer = GolfScoreSerializer(score, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)

	def delete(self, request, pk):
		score = self.get_object(request.user, pk)
		score.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)
