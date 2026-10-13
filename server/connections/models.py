import uuid

from django.db import models

from core.models import Tenant


class DataConnection(models.Model):
    class Kind(models.TextChoices):
        POSTGRES = "postgres", "PostgreSQL"
        MYSQL = "mysql", "MySQL/MariaDB"
        MSSQL = "mssql", "SQL Server"
        ORACLE = "oracle", "Oracle"
        SNOWFLAKE = "snowflake", "Snowflake"
        BIGQUERY = "bigquery", "BigQuery"
        CLICKHOUSE = "clickhouse", "ClickHouse"
        SQLITE = "sqlite", "SQLite"
        S3 = "s3", "S3"
        NESSIE = "nessie", "Nessie / Iceberg REST"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="connections")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=40, choices=Kind.choices)
    config = models.JSONField(default=dict)  # non-secret fields
    secret_encrypted = models.TextField(blank=True, default="")  # encrypted JSON string
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("tenant", "name")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.kind})"
