from rest_framework import serializers

from .models import Report, ReportGroup


class ReportSerializer(serializers.ModelSerializer):
    # Accept and return report group by its `code` (UUID) to match frontend.
    group = serializers.SlugRelatedField(
        slug_field="code", queryset=ReportGroup.objects.all()
    )

    class Meta:
        model = Report
        fields = (
            "id",
            "report_id",
            "name",
            "group",
            "dataset",
            "criteria",
            "spec",
            "created_at",
            "updated_at",
        )


class ReportGroupSerializer(serializers.ModelSerializer):
    reports = ReportSerializer(many=True, read_only=True)

    class Meta:
        model = ReportGroup
        fields = ("id", "code", "group_name", "description", "reports", "created_at")
