from uuid import UUID

from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, User
from core.tenancy import resolve_tenant_for_user

from .access import allowed_report_group_ids_for_user, user_has_full_report_access
from .models import Report, ReportGroup, UserReportGroupAccess
from .serializers import ReportGroupSerializer, ReportSerializer


class TenantScopedQuerysetMixin:
    def get_tenant(self):
        return resolve_tenant_for_user(request=self.request, user=self.request.user).tenant

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())


class EditorOrAdminWriteMixin:
    """Block creates/updates/deletes for Viewers (they may only read allowed groups/reports)."""

    def _require_editor_or_admin(self):
        tenant = self.get_tenant()
        if not user_has_full_report_access(self.request.user, tenant):
            raise PermissionDenied("Admin or Editor role required for this action.")

    def create(self, request, *args, **kwargs):
        self._require_editor_or_admin()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._require_editor_or_admin()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._require_editor_or_admin()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._require_editor_or_admin()
        return super().destroy(request, *args, **kwargs)


class ReportAccessQuerysetMixin:
    """Restrict Viewers to report groups (and reports) granted via UserReportGroupAccess."""

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self.get_tenant()
        allowed = allowed_report_group_ids_for_user(self.request.user, tenant)
        if allowed is None:
            return qs
        return qs.filter(group_id__in=allowed)


class ReportGroupViewSet(EditorOrAdminWriteMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = ReportGroupSerializer
    queryset = ReportGroup.objects.all().prefetch_related("reports")
    lookup_field = "code"

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self.get_tenant()
        allowed = allowed_report_group_ids_for_user(self.request.user, tenant)
        if allowed is None:
            return qs
        return qs.filter(id__in=allowed)


class ReportViewSet(
    ReportAccessQuerysetMixin,
    EditorOrAdminWriteMixin,
    TenantScopedQuerysetMixin,
    viewsets.ModelViewSet,
):
    permission_classes = (IsAuthenticated,)
    serializer_class = ReportSerializer
    queryset = Report.objects.all().select_related("group")

    def create(self, request, *args, **kwargs):
        self._require_editor_or_admin()
        # Ensure group lookup is tenant-scoped.
        tenant = self.get_tenant()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = serializer.validated_data["group"]
        if group.tenant_id != tenant.id:
            return Response({"detail": "Invalid report group"}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(tenant=tenant)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """Keep report-group relationships tenant scoped during PUT/PATCH too."""
        group = serializer.validated_data.get("group")
        if group and group.tenant_id != self.get_tenant().id:
            raise PermissionDenied("Invalid report group for this workspace.")
        serializer.save()


class IsTenantAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        ctx = resolve_tenant_for_user(request=request, user=request.user)
        m = Membership.objects.filter(user=request.user, tenant=ctx.tenant).first()
        return bool(m and m.role == Membership.Role.ADMIN)


class ReportGroupAccessView(APIView):
    """
    GET: list tenant members with their assigned report group codes (Admin only).
    PUT: replace assignments for one user (Admin only).
    Body: {"user_id": <int>, "report_group_codes": [<uuid str>, ...]}
    """

    permission_classes = (IsAuthenticated, IsTenantAdmin)

    def get(self, request):
        ctx = resolve_tenant_for_user(request=request, user=request.user)
        tenant = ctx.tenant
        memberships = (
            Membership.objects.select_related("user")
            .filter(tenant=tenant)
            .order_by("-created_at")
        )
        user_ids = [m.user_id for m in memberships]
        access_rows = UserReportGroupAccess.objects.filter(
            user_id__in=user_ids, report_group__tenant=tenant
        ).select_related("report_group")
        codes_by_user = {}
        for row in access_rows:
            codes_by_user.setdefault(row.user_id, []).append(str(row.report_group.code))

        users_out = []
        for m in memberships:
            u = m.user
            users_out.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "name": u.full_name or u.username,
                    "email": u.email or "",
                    "role": m.role,
                    "status": m.status,
                    "report_group_codes": codes_by_user.get(u.id, []),
                }
            )
        return Response({"users": users_out})

    def put(self, request):
        ctx = resolve_tenant_for_user(request=request, user=request.user)
        tenant = ctx.tenant
        user_id = request.data.get("user_id")
        codes = request.data.get("report_group_codes")
        if user_id is None or not isinstance(codes, list):
            return Response(
                {"detail": "Expected user_id and report_group_codes (list)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid user_id."}, status=status.HTTP_400_BAD_REQUEST)

        target_membership = Membership.objects.filter(user_id=user_id, tenant=tenant).first()
        if not target_membership:
            return Response({"detail": "User is not a member of this workspace."}, status=404)

        if user_has_full_report_access(User.objects.get(pk=user_id), tenant):
            return Response(
                {
                    "detail": "Admin and Editor users already have access to all report groups; assignments are not stored.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed_codes = []
        for c in codes:
            try:
                parsed_codes.append(UUID(c))
            except (TypeError, ValueError):
                return Response(
                    {"detail": f"Invalid report group code: {c!r}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        groups = list(ReportGroup.objects.filter(tenant=tenant, code__in=parsed_codes))
        if len(groups) != len(set(parsed_codes)):
            return Response(
                {"detail": "One or more report group codes are invalid for this workspace."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        UserReportGroupAccess.objects.filter(user_id=user_id, report_group__tenant=tenant).delete()
        UserReportGroupAccess.objects.bulk_create(
            [UserReportGroupAccess(user_id=user_id, report_group=g) for g in groups],
            batch_size=500,
        )
        return Response(
            {
                "user_id": user_id,
                "report_group_codes": [str(g.code) for g in groups],
            }
        )
