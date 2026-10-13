from rest_framework import serializers

from .models import AlertRule, Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = (
            "id",
            "name",
            "connection",
            "sql",
            "interval_minutes",
            "is_active",
            "last_run_at",
            "next_run_at",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "last_run_at", "next_run_at", "created_by", "created_at", "updated_at")


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = (
            "id",
            "name",
            "schedule",
            "metric",
            "operator",
            "threshold",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

