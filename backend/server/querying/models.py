from django.db import models

from connections.models import DataConnection
from core.models import Tenant, User


class QueryRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="query_runs")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="query_runs")
    connection = models.ForeignKey(
        DataConnection, on_delete=models.PROTECT, related_name="query_runs"
    )
    sql = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error = models.TextField(blank=True, default="")
    row_count = models.IntegerField(null=True, blank=True)
    preview = models.JSONField(blank=True, default=dict)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=("tenant", "user", "-created_at"), name="queryrun_user_history_idx"),
            models.Index(fields=("tenant", "status", "-created_at"), name="queryrun_status_history_idx"),
        ]

