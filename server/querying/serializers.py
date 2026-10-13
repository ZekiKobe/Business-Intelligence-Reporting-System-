from rest_framework import serializers

from .models import QueryRun


class SqlExecuteSerializer(serializers.Serializer):
    connection_id = serializers.UUIDField()
    sql = serializers.CharField()
    limit = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=200000,
        default=None,
    )


class QueryRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryRun
        fields = (
            "id",
            "connection",
            "status",
            "error",
            "row_count",
            "duration_ms",
            "preview",
            "parameters",
            "started_at",
            "finished_at",
            "created_at",
        )


class QueryRunHistorySerializer(serializers.ModelSerializer):
    """History deliberately omits SQL text and preview data."""

    class Meta:
        model = QueryRun
        fields = (
            "id", "connection", "status", "error", "row_count", "duration_ms",
            "started_at", "finished_at", "created_at",
        )
