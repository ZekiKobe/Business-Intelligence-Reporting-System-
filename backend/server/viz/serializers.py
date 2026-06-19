from rest_framework import serializers

from .models import Chart, Dashboard, Dataset


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = (
            "id",
            "public_id",
            "name",
            "connection",
            "kind",
            "definition",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "created_by", "created_at", "updated_at")


class ChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chart
        fields = (
            "id",
            "public_id",
            "name",
            "dataset",
            "viz_type",
            "spec",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "created_by", "created_at", "updated_at")


class DashboardSerializer(serializers.ModelSerializer):
    charts = serializers.PrimaryKeyRelatedField(many=True, queryset=Chart.objects.all(), required=False)

    class Meta:
        model = Dashboard
        fields = (
            "id",
            "public_id",
            "name",
            "description",
            "charts",
            "layout",
            "filters",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "created_by", "created_at", "updated_at")

