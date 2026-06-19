from datetime import datetime, timedelta, timezone

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.tenancy import resolve_tenant_for_user
from querying.executor import execute_sql
from querying.models import QueryRun
from querying.sql_safety import ensure_readonly_sql

from .models import AlertEvent, AlertRule, Schedule
from .serializers import AlertRuleSerializer, ScheduleSerializer


class TenantScopedMixin:
    def get_tenant(self):
        return resolve_tenant_for_user(request=self.request, user=self.request.user).tenant

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant(), created_by=self.request.user)


class ScheduleViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ScheduleSerializer
    queryset = Schedule.objects.all().select_related("connection", "created_by")

    @action(detail=True, methods=["post"])
    def run_now(self, request, pk=None):
        schedule = self.get_object()
        tenant = self.get_tenant()
        user = request.user

        ensure_readonly_sql(schedule.sql)

        run = QueryRun.objects.create(
            tenant=tenant,
            user=user,
            connection=schedule.connection,
            sql=schedule.sql,
            status=QueryRun.Status.RUNNING,
            started_at=datetime.now(tz=timezone.utc),
        )

        try:
            row_count, preview = execute_sql(connection=schedule.connection, sql=schedule.sql, limit=500)
            run.status = QueryRun.Status.SUCCEEDED
            run.row_count = row_count
            run.preview = {"rows": preview}
        except Exception as e:
            run.status = QueryRun.Status.FAILED
            run.error = str(e)
        finally:
            run.finished_at = datetime.now(tz=timezone.utc)
            run.save(update_fields=["status", "row_count", "preview", "error", "finished_at"])

        # Evaluate alert rules for this schedule.
        events = []
        for rule in schedule.alert_rules.filter(is_active=True):
            if rule.metric == "row_count" and run.row_count is not None:
                val = float(run.row_count)
                threshold = rule.threshold
                op = rule.operator
                triggered = (
                    (op == ">" and val > threshold)
                    or (op == ">=" and val >= threshold)
                    or (op == "<" and val < threshold)
                    or (op == "<=" and val <= threshold)
                    or (op == "==" and val == threshold)
                    or (op == "!=" and val != threshold)
                )
                if triggered:
                    msg = f"Alert '{rule.name}' triggered: {val} {op} {threshold}"
                    event = AlertEvent.objects.create(
                        tenant=tenant,
                        rule=rule,
                        query_run=run,
                        message=msg,
                    )
                    events.append({"id": event.id, "message": msg})

        return Response(
            {
                "run_id": run.id,
                "status": run.status,
                "row_count": run.row_count,
                "alerts": events,
            }
        )


class AlertRuleViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = AlertRuleSerializer
    queryset = AlertRule.objects.all().select_related("schedule", "created_by")

from django.shortcuts import render

# Create your views here.
