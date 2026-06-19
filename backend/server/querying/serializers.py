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
            "sql",
            "status",
            "error",
            "row_count",
            "preview",
            "started_at",
            "finished_at",
            "created_at",
        )
