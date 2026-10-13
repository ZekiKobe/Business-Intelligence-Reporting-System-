from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import Membership, Tenant, TenantBranding, User
from .serializers import (
    ExternalLoginSerializer,
    MembershipSerializer,
    PortalBrandingWriteSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    branding_to_camel,
)
from .tenancy import TENANT_HEADER, resolve_tenant_for_user


class ExternalLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = ExternalLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data["user"]

        # Pick tenant: header/tenant_slug later; for now first membership or bootstrap.
        ctx = resolve_tenant_for_user(request=request, user=user)

        refresh = RefreshToken.for_user(user)
        refresh["tenant_slug"] = ctx.tenant.slug
        access = refresh.access_token
        access["tenant_slug"] = ctx.tenant.slug

        memberships = (
            Membership.objects.select_related("tenant")
            .filter(user=user)
            .order_by("created_at")
        )

        # Match existing frontend: `sessionId` expected by `aba_bi_frontend`.
        resp = Response(
            {
                "sessionId": str(access),
                "access": str(access),
                "refresh": str(refresh),
                "tenant": {"slug": ctx.tenant.slug, "name": ctx.tenant.name},
                "memberships": MembershipSerializer(memberships, many=True).data,
            }
        )
        # Cookie auth for `bi-dashboard` which currently doesn't attach tokens.
        resp.set_cookie(
            "access_token",
            str(access),
            httponly=True,
            samesite="Lax",
        )
        resp.set_cookie(
            "refresh_token",
            str(refresh),
            httponly=True,
            samesite="Lax",
        )
        return resp


class CreateUserView(APIView):
    @staticmethod
    def _require_tenant_admin(request):
        ctx = resolve_tenant_for_user(request=request, user=request.user)
        if not ctx.membership or ctx.membership.role != Membership.Role.ADMIN:
            return ctx, Response(
                {"detail": "Only administrators can manage users."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return ctx, None

    def get(self, request):
        ctx, denied = self._require_tenant_admin(request)
        if denied:
            return denied
        memberships = (
            # pylint: disable=no-member
            Membership.objects.select_related("user")
            .filter(tenant=ctx.tenant)
            .order_by("-created_at")
        )
        data = [
            {
                "id": m.user.id,
                "name": m.user.full_name or m.user.username,
                "email": m.user.email,
                "role": m.role,
                "status": m.status,
                "joinDate": m.created_at.date().isoformat(),
                "username": m.user.username,
            }
            for m in memberships
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        ctx, denied = self._require_tenant_admin(request)
        if denied:
            return denied
        serializer = UserCreateSerializer(data=request.data, context={"tenant": ctx.tenant})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
            },
            status=status.HTTP_201_CREATED,
        )


class UserDetailView(APIView):
    """Update or remove a user from the current tenant without affecting other tenants."""

    def put(self, request, user_id):
        return self.patch(request, user_id)

    def patch(self, request, user_id):
        ctx, denied = CreateUserView._require_tenant_admin(request)
        if denied:
            return denied

        membership = (
            Membership.objects.select_related("user")
            .filter(tenant=ctx.tenant, user_id=user_id)
            .first()
        )
        if not membership:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user_id == request.user.id:
            if request.data.get("status") == "Inactive":
                return Response(
                    {"detail": "You cannot deactivate your own account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                request.data.get("role")
                and request.data.get("role") != Membership.Role.ADMIN
            ):
                other_admins = (
                    Membership.objects.filter(tenant=ctx.tenant, role=Membership.Role.ADMIN)
                    .exclude(user_id=user_id)
                    .exists()
                )
                if not other_admins:
                    return Response(
                        {"detail": "Cannot demote the only administrator in this workspace."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        serializer = UserUpdateSerializer(
            data=request.data,
            context={"tenant": ctx.tenant, "target_user": membership.user, "membership": membership},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.update(membership.user, serializer.validated_data)
        membership.refresh_from_db()

        return Response(
            {
                "id": user.id,
                "name": user.full_name or user.username,
                "username": user.username,
                "email": user.email,
                "role": membership.role,
                "status": membership.status,
                "joinDate": membership.created_at.date().isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, user_id):
        ctx, denied = CreateUserView._require_tenant_admin(request)
        if denied:
            return denied
        if user_id == request.user.id:
            return Response(
                {"detail": "You cannot remove your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = Membership.objects.filter(tenant=ctx.tenant, user_id=user_id).first()
        if not membership:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user = membership.user
        membership.delete()
        if not user.memberships.exists():
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        ctx = resolve_tenant_for_user(request=request, user=request.user)

        # pylint: disable=no-member
        membership = (
            Membership.objects.select_related("user")
            .filter(user=request.user, tenant=ctx.tenant)
            .order_by("-created_at")
            .first()
        )

        user = request.user
        name = user.full_name or user.username or ""
        parts = str(name).split() if name else []
        first = parts[0] if parts else ""
        last = " ".join(parts[1:]) if len(parts) > 1 else ""

        return Response(
            {
                "id": user.id,
                "firstName": first,
                "lastName": last,
                "email": user.email,
                "phone": "",
                "address": "",
                "department": membership.status if membership else "Active",
                "position": membership.role if membership else "Viewer",
                "joinDate": membership.created_at.date().isoformat() if membership else "",
                "status": membership.status if membership else "Active",
                "role": membership.role if membership else "Viewer",
            }
        )


class RegisterView(APIView):
    """
    Legacy URL; public self-registration is disabled. Use admin user creation (POST /api/user).
    """

    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        return Response(
            {
                "detail": "Public registration is disabled. Accounts are created by an administrator.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )


class LoginView(ExternalLoginView):
    """
    Alias endpoint for cleaner auth API:
    POST /api/auth/login/
    """
    permission_classes = (permissions.AllowAny,)


class CookieTokenRefreshView(TokenRefreshView):
    """
    Standard JWT refresh; updates httponly access cookie to match login flow.
    Adds sessionId for frontends that expect the same shape as auth/login/.
    """

    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != status.HTTP_200_OK:
            return response
        access = response.data.get("access")
        payload = dict(response.data)
        if access:
            payload["sessionId"] = access
        out = Response(payload, status=response.status_code)
        if access:
            out.set_cookie(
                "access_token",
                access,
                httponly=True,
                samesite="Lax",
            )
        return out


def _resolve_branding_tenant(request):
    slug = request.query_params.get("tenant") or request.META.get(TENANT_HEADER)
    if slug:
        return Tenant.objects.filter(slug=slug.strip(), is_active=True).first()
    tenant = Tenant.objects.filter(slug="default", is_active=True).first()
    if tenant:
        return tenant
    return Tenant.objects.filter(is_active=True).order_by("id").first()


def _get_or_create_branding(tenant: Tenant) -> TenantBranding:
    branding, _ = TenantBranding.objects.get_or_create(tenant=tenant, defaults={})
    return branding


DEFAULT_BRANDING_PAYLOAD = {
    "companyName": "Your Company",
    "productName": "BI Studio",
    "tagline": "Modern analytics workspace",
    "logoUrl": "/images/logo1.ico",
    "primaryColor": "#2563eb",
    "accentColor": "#14b8a6",
    "darkMode": False,
}


class PortalBrandingView(APIView):
    """
    GET: public for login pages — optional ?tenant=slug or X-Tenant-Slug header.
    PATCH: tenant Admin only — updates persist for Dashboard + viewer portal.
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        tenant = _resolve_branding_tenant(request)
        if not tenant:
            return Response(DEFAULT_BRANDING_PAYLOAD)
        branding = _get_or_create_branding(tenant)
        return Response(branding_to_camel(branding))

    def patch(self, request):
        ctx = resolve_tenant_for_user(request=request, user=request.user)
        if not ctx.membership or ctx.membership.role != Membership.Role.ADMIN:
            return Response(
                {"detail": "Only administrators can update branding."},
                status=status.HTTP_403_FORBIDDEN,
            )
        branding = _get_or_create_branding(ctx.tenant)
        ser = PortalBrandingWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.update(branding, ser.validated_data)
        branding.refresh_from_db()
        return Response(branding_to_camel(branding))


class LogoutView(APIView):
    """Clear auth cookies (httponly); clients should also drop local tokens."""

    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        resp = Response({"detail": "logged out"}, status=status.HTTP_200_OK)
        resp.delete_cookie("access_token", path="/", samesite="Lax")
        resp.delete_cookie("refresh_token", path="/", samesite="Lax")
        return resp
