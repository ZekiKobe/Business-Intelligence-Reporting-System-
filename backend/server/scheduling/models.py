from django.db import models

from connections.models import DataConnection
from core.models import Tenant, User
from querying.models import QueryRun


class Schedule(models.Model):
    """
    Simple time-based schedule for running a SQL query or dataset.
    For now we support a basic interval in minutes; later this can become cron.
    """

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="schedules")
    name = models.CharField(max_length=200)
    connection = models.ForeignKey(
        DataConnection, on_delete=models.PROTECT, related_name="schedules"
    )
    sql = models.TextField(help_text="Read-only SQL to execute on schedule")
    interval_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, null=True, on_delete=models.SET_NULL, related_name="created_schedules"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class AlertRule(models.Model):
    """
    Threshold alert on last query result (for now on row_count).
    """

    class Operator(models.TextChoices):
        GT = ">", ">"
        GTE = ">=", ">="
        LT = "<", "<"
        LTE = "<=", "<="
        EQ = "==", "=="
        NE = "!=", "!="

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="alert_rules")
    name = models.CharField(max_length=200)
    schedule = models.ForeignKey(
        Schedule, on_delete=models.CASCADE, related_name="alert_rules"
    )
    metric = models.CharField(
        max_length=50, default="row_count", help_text="Metric to evaluate (row_count for now)"
    )
    operator = models.CharField(max_length=4, choices=Operator.choices, default=Operator.GT)
    threshold = models.FloatField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, null=True, on_delete=models.SET_NULL, related_name="created_alert_rules"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class AlertEvent(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="alert_events")
    rule = models.ForeignKey(
        AlertRule, on_delete=models.CASCADE, related_name="events"
    )
    query_run = models.ForeignKey(
        QueryRun, on_delete=models.CASCADE, related_name="alert_events"
    )
    triggered_at = models.DateTimeField(auto_now_add=True)
    message = models.TextField()

