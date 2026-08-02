import logging
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from .models import User
from .serializers import (
    SignupSerializer, UserSerializer, UserSettingsSerializer,
    ChangePasswordSerializer, AdminUserUpdateSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Auth-specific throttle (stricter than global default)
# ---------------------------------------------------------------------------
class AuthRateThrottle(ScopedRateThrottle):
    scope = 'auth'


# ---------------------------------------------------------------------------
# Authentication Views
# ---------------------------------------------------------------------------
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint with stricter rate limiting to prevent brute-force attacks.
    Returns JWTs in HTTP-only cookies.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    @method_decorator(ratelimit(key='ip', rate='30/m', block=True), name='dispatch')
    def post(self, request, *args, **kwargs):
        logger.info("Login attempt for email: %s", request.data.get('email', 'unknown'))
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = response.data.get('access')
            refresh_token = response.data.get('refresh')

            # Create a new response object to set cookies
            cookie_response = Response({"message": "Login successful."}, status=status.HTTP_200_OK)

            # Set access token as an HTTP-only cookie
            cookie_response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE, # Use True in production with HTTPS
                samesite='Lax',
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
            )
            # Set refresh token as an HTTP-only cookie
            cookie_response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE, # Use True in production with HTTPS
                samesite='Lax',
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()
            )
            logger.info("Login successful for email: %s", request.data.get('email'))
            return cookie_response
        else:
            logger.warning("Login failed for email: %s with status: %s", request.data.get('email'), response.status_code)
            return response


class CookieTokenRefreshView(TokenRefreshView):
    """
    Custom TokenRefreshView to get refresh token from cookies and set new tokens in cookies.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    @method_decorator(ratelimit(key='ip', rate='30/m', block=True), name='dispatch')
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({"detail": "Refresh token not found in cookies."}, status=status.HTTP_401_UNAUTHORIZED)

        # Temporarily put the refresh token into request.data for the parent class to process
        request.data['refresh'] = refresh_token

        try:
            response = super().post(request, *args, **kwargs)

            if response.status_code == 200:
                access_token = response.data.get('access')
                new_refresh_token = response.data.get('refresh') # May or may not be present depending on SIMPLE_JWT settings

                cookie_response = Response({"message": "Token refreshed successfully."}, status=status.HTTP_200_OK)

                cookie_response.set_cookie(
                    key='access_token',
                    value=access_token,
                    httponly=True,
                    secure=settings.SESSION_COOKIE_SECURE,
                    samesite='Lax',
                    max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
                )
                if new_refresh_token: # If refresh token rotation is enabled
                    cookie_response.set_cookie(
                        key='refresh_token',
                        value=new_refresh_token,
                        httponly=True,
                        secure=settings.SESSION_COOKIE_SECURE,
                        samesite='Lax',
                        max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()
                    )
                logger.info("Tokens refreshed for user via cookie.")
                return cookie_response
            else:
                return response
        except InvalidToken:
            logger.warning("Invalid refresh token during refresh attempt.")
            response = Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response
        except TokenError as e:
            logger.error("Token error during refresh: %s", str(e))
            response = Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response


class SignupView(generics.CreateAPIView):
    """
    User registration endpoint with rate limiting.
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = SignupSerializer
    throttle_classes = [AuthRateThrottle]

    def perform_create(self, serializer):
        # Create user and set as active (enabled immediate login)
        user = serializer.save()
        user.is_active = True 
        user.save()
        logger.info("New user registered and activated: %s (id=%s)", user.email, user.id)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserSettingsSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        # Allow partial updates (PATCH)
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Use UserSettingsSerializer for validation and data saving
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return the FULL user profile regardless of which serializer was used for input
        full_serializer = UserSerializer(instance, context=self.get_serializer_context())
        return Response(full_serializer.data)


class ChangePasswordView(APIView):
    """
    Endpoint for changing password.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.data.get("new_password"))
            user.save()
            
            return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Request a password reset email.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success to prevent email enumeration
            return Response({"detail": "If an account with this email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)
            
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        frontend_url = settings.FRONTEND_URL
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
        
        try:
            send_mail(
                subject='CEAL-Calendar Password Reset',
                message=f'Click the following link to reset your password: {reset_link}\n\nThis link will expire in 15 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info("Password reset email sent to %s", user.email)
        except Exception as e:
            logger.error("Failed to send password reset email to %s: %s", user.email, str(e))
            
        return Response({"detail": "If an account with this email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        password = request.data.get('password')
        if not password:
            return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
            
        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(password)
            user.save()
            logger.info("Password successfully reset for user %s via token", user.email)
            return Response({"detail": "Password reset successfully."}, status=status.HTTP_200_OK)
        else:
            logger.warning("Invalid password reset token used for uidb64: %s", uidb64)
            return Response({"error": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    Logout endpoint (blacklist refresh token and clear cookies).
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            response = Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            logger.info("User logged out: %s", request.user.email)
            return response
        except Exception as e:
            logger.warning("Logout failed for user %s: %s", request.user.email, str(e))
            response = Response({"error": "Logout failed or token invalid."}, status=status.HTTP_400_BAD_REQUEST)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response


# ---------------------------------------------------------------------------
# Admin Views (split from the broken multi-inherited UserViewSet)
# ---------------------------------------------------------------------------
class UserListView(generics.ListAPIView):
    """
    Admin endpoint to list all users.
    """
    queryset = User.objects.select_related('club', 'sub_club').prefetch_related('extra_clubs').all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin endpoint to retrieve, update, or delete a single user.
    """
    queryset = User.objects.select_related('club', 'sub_club').prefetch_related('extra_clubs').all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminUserUpdateSerializer
        return UserSerializer

    def perform_update(self, serializer):
        user = serializer.save()
        from accounts.models import ActivityLog
        ActivityLog.objects.create(
            actor=self.request.user,
            action='USER_ACCESS',
            entity_type='User',
            entity_id=str(user.id),
            details={
                'email': user.email,
                'club': user.club.name if user.club else None,
                'sub_club': user.sub_club.name if user.sub_club else None,
                'extra_clubs': [c.name for c in user.extra_clubs.all()]
            }
        )

    def perform_destroy(self, instance):
        logger.warning("Admin %s deleted user %s (id=%s)", self.request.user.email, instance.email, instance.id)
        instance.delete()


class VersionView(APIView):
    """
    Get the current backend version.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"version": settings.APP_VERSION})
