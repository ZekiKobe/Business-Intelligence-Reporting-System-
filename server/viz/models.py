import uuid

from django.db import models

from connections.models import DataConnection
from core.models import Tenant, User


class Dataset(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="datasets")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=200)
    connection = models.ForeignKey(
        DataConnection, on_delete=models.PROTECT, related_name="datasets"
    )
    kind = models.CharField(max_length=40, default="sql")  # sql|table|view
    definition = models.JSONField(default=dict)  # {sql, table, schema, ...}
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="datasets")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "name")


class Chart(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="charts")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=200)
    dataset = models.ForeignKey(Dataset, on_delete=models.PROTECT, related_name="charts")
    viz_type = models.CharField(max_length=80)  # e.g. bar/line/pie/table
    spec = models.JSONField(default=dict)  # frontend-driven viz spec
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="charts")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Dashboard(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="dashboards")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    charts = models.ManyToManyField(Chart, blank=True, related_name="dashboards")
    layout = models.JSONField(default=dict)  # grid/layout JSON
    filters = models.JSONField(default=dict)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="dashboards")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
