from datetime import datetime, timezone
import json
import logging
import re
from time import perf_counter

from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from connections.models import DataConnection
from core.tenancy import resolve_tenant_for_user
from reporting.access import allowed_report_group_ids_for_user
from reporting.models import Report

from .executor import execute_sql
from .models import QueryRun
from .serializers import QueryRunHistorySerializer, QueryRunSerializer, SqlExecuteSerializer
from .sql_safety import ensure_readonly_sql

logger = logging.getLogger(__name__)
_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)*$")


def _report_sql(report: Report) -> tuple[DataConnection, str]:
    """Build the limited report query server-side from trusted report metadata."""
    spec = report.spec or {}
    connection_id = spec.get("connection_public_id")
    table = spec.get("table") or report.dataset
    columns = [
        *spec.get("main_columns", []), *spec.get("header_columns", []),
        *spec.get("aggregate_columns", []), *spec.get("filter_columns", []),
    ]
    columns = list(dict.fromkeys(str(column) for column in columns if column))
    if not connection_id or not table:
        raise ValueError("This report is missing its data source configuration.")
    if not _IDENTIFIER.fullmatch(str(table)) or any(not _IDENTIFIER.fullmatch(column) for column in columns):
        raise ValueError("This report contains an invalid dataset or column identifier.")
    connection = DataConnection.objects.filter(
        tenant=report.tenant, public_id=connection_id, is_active=True
    ).first()
    if not connection:
        raise ValueError("The report data source is unavailable.")
    return connection, f"SELECT {', '.join(columns) if columns else '*'} FROM {table}"


def _execute_run(run: QueryRun, *, limit: int | None) -> QueryRun:
    started = perf_counter()
    try:
        row_count, preview = execute_sql(connection=run.connection, sql=run.sql, limit=limit)
        run.status = QueryRun.Status.SUCCEEDED
        run.row_count = row_count
        run.preview = {"rows": json.loads(json.dumps(preview, cls=DjangoJSONEncoder))}
    except Exception:
        logger.exception("Report execution failed", extra={"query_run_id": run.id, "connection_id": run.connection_id})
        run.status = QueryRun.Status.FAILED
        run.error = "The report could not be completed. Please retry or contact an administrator."
    finally:
        run.duration_ms = round((perf_counter() - started) * 1000)
        run.finished_at = datetime.now(tz=timezone.utc)
        run.save(update_fields=["status", "row_count", "preview", "error", "duration_ms", "finished_at"])
    return run


class SqlExecuteView(APIView):
    """Direct SQL remains available for report authors, never viewers."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        if allowed_report_group_ids_for_user(request.user, tenant) is not None:
            return Response({"detail": "Direct SQL execution requires an Editor or Admin role."}, status=status.HTTP_403_FORBIDDEN)
        ser = SqlExecuteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            ensure_readonly_sql(ser.validated_data["sql"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        connection = DataConnection.objects.filter(
            tenant=tenant, public_id=ser.validated_data["connection_id"], is_active=True
        ).first()
        if not connection:
            return Response({"detail": "Connection not found"}, status=status.HTTP_404_NOT_FOUND)
        run = QueryRun.objects.create(
            tenant=tenant, user=request.user, connection=connection,
            sql=ser.validated_data["sql"], status=QueryRun.Status.RUNNING,
            started_at=datetime.now(tz=timezone.utc),
        )
        return Response(QueryRunSerializer(_execute_run(run, limit=ser.validated_data.get("limit"))).data)


class ReportExecuteView(APIView):
    """Execute an authorized saved report without accepting browser-supplied SQL."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, report_id: int):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        report = Report.objects.filter(id=report_id, tenant=tenant).first()
        allowed_groups = allowed_report_group_ids_for_user(request.user, tenant)
        if not report or (allowed_groups is not None and report.group_id not in allowed_groups):
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            connection, sql = _report_sql(report)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit = int(request.data.get("limit")) if request.data.get("limit") is not None else None
        except (TypeError, ValueError):
            return Response({"detail": "Invalid row limit."}, status=status.HTTP_400_BAD_REQUEST)
        if limit is not None and not 1 <= limit <= 200000:
            return Response({"detail": "Row limit must be between 1 and 200000."}, status=status.HTTP_400_BAD_REQUEST)
        run = QueryRun.objects.create(
            tenant=tenant, user=request.user, connection=connection, sql=sql,
            status=QueryRun.Status.RUNNING, started_at=datetime.now(tz=timezone.utc),
        )
        return Response(QueryRunSerializer(_execute_run(run, limit=limit)).data)


class QueryHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        qs = QueryRun.objects.filter(tenant=tenant, user=request.user).order_by("-created_at")[:100]
        return Response(QueryRunHistorySerializer(qs, many=True).data)
