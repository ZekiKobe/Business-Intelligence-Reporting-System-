import uuid

from django.conf import settings
from django.db import models

from core.models import Tenant


class ReportGroup(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="report_groups")
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    group_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("tenant", "group_name")

    def __str__(self) -> str:  # pragma: no cover
        return self.group_name


class Report(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="reports")
    report_id = models.CharField(max_length=120)
    name = models.CharField(max_length=200)
    group = models.ForeignKey(ReportGroup, on_delete=models.PROTECT, related_name="reports")
    dataset = models.CharField(max_length=200, blank=True, default="")
    criteria = models.TextField(blank=True, default="")
    spec = models.JSONField(blank=True, default=dict)  # for future: designed report layout/viz
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "report_id")

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class UserReportGroupAccess(models.Model):
    """
    Per-tenant report group access for portal users.
    Viewers only see groups (and reports) listed here; Admin and Editor are unrestricted.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="report_group_accesses",
    )
    report_group = models.ForeignKey(
        ReportGroup,
        on_delete=models.CASCADE,
        related_name="user_accesses",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "report_group")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_id} -> {self.report_group_id}"
