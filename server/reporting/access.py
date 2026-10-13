"""Report group visibility: Viewers are restricted to assigned groups; Admin and Editor see all."""

from __future__ import annotations

from django.contrib.auth import get_user_model

from core.models import Membership

from .models import UserReportGroupAccess

User = get_user_model()


def user_has_full_report_access(user, tenant) -> bool:
    membership = (
        Membership.objects.filter(user=user, tenant=tenant).order_by("-created_at").first()
    )
    if not membership:
        return False
    return membership.role in (Membership.Role.ADMIN, Membership.Role.EDITOR)


def allowed_report_group_ids_for_user(user, tenant) -> list[int] | None:
    """
    None means no restriction (all groups in tenant).
    Empty list means user sees no groups (Viewer with no assignments).
    """
    if user_has_full_report_access(user, tenant):
        return None
    return list(
        UserReportGroupAccess.objects.filter(user=user, report_group__tenant=tenant).values_list(
            "report_group_id", flat=True
        )
    )
