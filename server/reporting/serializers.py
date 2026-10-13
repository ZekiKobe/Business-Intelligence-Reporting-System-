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

    def validate_spec(self, spec):
        """Validate filter metadata stored in the existing report definition.

        Old definitions without ``filter_configs`` remain valid and retain their
        no-WHERE execution behaviour.
        """
        if not isinstance(spec, dict):
            raise serializers.ValidationError("Report specification must be an object.")
        configs = spec.get("filter_configs")
        if configs is None:
            return spec
        if not isinstance(configs, list):
            raise serializers.ValidationError({"filter_configs": "Must be a list."})
        columns = {str(c) for c in spec.get("filter_columns", [])}
        keys = set()
        for index, config in enumerate(configs):
            if not isinstance(config, dict):
                raise serializers.ValidationError({"filter_configs": {index: "Must be an object."}})
            key = str(config.get("key") or "")
            if not key or key not in columns:
                raise serializers.ValidationError({"filter_configs": {index: "Filter key must be a configured filter column."}})
            if key in keys:
                raise serializers.ValidationError({"filter_configs": {index: "Filter keys must be unique."}})
            keys.add(key)
            if config.get("type", "select") not in {"date", "select", "text", "number"}:
                raise serializers.ValidationError({"filter_configs": {index: "Unsupported filter type."}})
            if "required" in config and not isinstance(config["required"], bool):
                raise serializers.ValidationError({"filter_configs": {index: "required must be true or false."}})
            if "options" in config and not isinstance(config["options"], list):
                raise serializers.ValidationError({"filter_configs": {index: "options must be a list."}})
        return spec


class ReportGroupSerializer(serializers.ModelSerializer):
    reports = ReportSerializer(many=True, read_only=True)

    class Meta:
        model = ReportGroup
        fields = ("id", "code", "group_name", "description", "reports", "created_at")
