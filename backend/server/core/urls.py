from django.urls import path

from .views import (
    CookieTokenRefreshView,
    CreateUserView,
    CurrentUserView,
    ExternalLoginView,
    LoginView,
    LogoutView,
    PortalBrandingView,
    RegisterView,
)


urlpatterns = [
    path("branding/", PortalBrandingView.as_view(), name="portal-branding"),
    path("external-login/", ExternalLoginView.as_view(), name="external-login"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/token/refresh/", CookieTokenRefreshView.as_view(), name="auth-token-refresh"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("user", CreateUserView.as_view(), name="user-create"),  # no trailing slash (frontend)
    path("user/", CreateUserView.as_view(), name="user-create-slash"),
    path("user/me/", CurrentUserView.as_view(), name="user-me"),
    path("user/me", CurrentUserView.as_view(), name="user-me-noslash"),
]

