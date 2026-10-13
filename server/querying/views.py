from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
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


def _report_sql(report: Report, supplied_parameters: dict) -> tuple[DataConnection, str, dict]:
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
    bound_parameters = {}
    where = []
    # Reports created before dynamic filter configuration retain their previous
    # no-WHERE semantics. Only explicitly configured filters affect SQL.
    configured_filters = spec.get("filter_configs") or []
    filter_columns = {str(column) for column in spec.get("filter_columns", [])}
    for index, config in enumerate(configured_filters):
        if not isinstance(config, dict):
            continue
        key = str(config.get("key") or "")
        if key not in filter_columns or not _IDENTIFIER.fullmatch(key):
            continue
        # An omitted (or blank) browser value is deliberately different from a
        # SQL NULL: optional filters are left out of the WHERE clause.  Defaults
        # are only used as a value when one was configured by the report author.
        value = supplied_parameters.get(key)
        if value is None or value == "":
            value = config.get("default")
        if value is None or value == "":
            if config.get("required", False):
                raise ValueError(f"{config.get('label') or key} is required.")
            continue
        kind = config.get("type", "select")
        if kind == "date":
            try:
                date.fromisoformat(str(value)[:10])
            except (TypeError, ValueError):
                raise ValueError(f"{config.get('label') or key} must be a valid date.")
        elif kind == "number":
            try:
                Decimal(str(value))
            except (InvalidOperation, TypeError, ValueError):
                raise ValueError(f"{config.get('label') or key} must be a valid number.")
        options = config.get("options")
        if isinstance(options, list) and options and value not in options and str(value) not in {str(v) for v in options}:
            raise ValueError(f"{config.get('label') or key} contains an invalid selection.")
        param_name = f"filter_{index}"
        where.append(f"{key} = :{param_name}")
        bound_parameters[param_name] = value

    sql = f"SELECT {', '.join(columns) if columns else '*'} FROM {table}"
    if where:
        sql = f"{sql} WHERE {' AND '.join(where)}"
    return connection, sql, bound_parameters


def _execute_run(run: QueryRun, *, limit: int | None) -> QueryRun:
    started = perf_counter()
    try:
        row_count, preview = execute_sql(connection=run.connection, sql=run.sql, limit=limit, parameters=run.bound_parameters)
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
            supplied_parameters = request.data.get("parameters") or {}
            if not isinstance(supplied_parameters, dict):
                return Response({"detail": "Invalid report parameters."}, status=status.HTTP_400_BAD_REQUEST)
            connection, sql, bound_parameters = _report_sql(report, supplied_parameters)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        try:
            limit = int(request.data.get("limit")) if request.data.get("limit") is not None else None
        except (TypeError, ValueError):
            return Response({"detail": "Invalid row limit."}, status=status.HTTP_400_BAD_REQUEST)
        if limit is not None and not 1 <= limit <= 200000:
            return Response({"detail": "Row limit must be between 1 and 200000."}, status=status.HTTP_400_BAD_REQUEST)
        visible_parameters = {}
        for config in (report.spec or {}).get("filter_configs") or []:
            if not isinstance(config, dict):
                continue
            key = config.get("key")
            if key and key in supplied_parameters and supplied_parameters[key] not in (None, ""):
                visible_parameters[str(key)] = supplied_parameters[key]
            elif key and config.get("default") not in (None, ""):
                visible_parameters[str(key)] = config["default"]
        run = QueryRun.objects.create(
            tenant=tenant, user=request.user, connection=connection, sql=sql,
            parameters=visible_parameters, bound_parameters=bound_parameters,
            status=QueryRun.Status.RUNNING, started_at=datetime.now(tz=timezone.utc),
        )
        return Response(QueryRunSerializer(_execute_run(run, limit=limit)).data)


class QueryHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        qs = QueryRun.objects.filter(tenant=tenant, user=request.user).order_by("-created_at")[:100]
        return Response(QueryRunHistorySerializer(qs, many=True).data)
