from datetime import datetime, timezone
import json

from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from connections.models import DataConnection
from core.tenancy import resolve_tenant_for_user

from .executor import execute_sql
from .models import QueryRun
from .serializers import QueryRunSerializer, SqlExecuteSerializer
from .sql_safety import ensure_readonly_sql


class SqlExecuteView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        ser = SqlExecuteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            ensure_readonly_sql(ser.validated_data["sql"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        conn = DataConnection.objects.filter(
            tenant=tenant, public_id=ser.validated_data["connection_id"], is_active=True
        ).first()
        if not conn:
            return Response({"detail": "Connection not found"}, status=status.HTTP_404_NOT_FOUND)

        run = QueryRun.objects.create(
            tenant=tenant,
            user=request.user,
            connection=conn,
            sql=ser.validated_data["sql"],
            status=QueryRun.Status.RUNNING,
            started_at=datetime.now(tz=timezone.utc),
        )

        try:
            row_count, preview = execute_sql(
                connection=conn,
                sql=ser.validated_data["sql"],
                limit=ser.validated_data.get("limit"),
            )
            # Ensure DB-native values (Decimal/datetime/etc.) are JSON-safe for JSONField.
            safe_preview = json.loads(json.dumps(preview, cls=DjangoJSONEncoder))
            run.status = QueryRun.Status.SUCCEEDED
            run.row_count = row_count
            run.preview = {"rows": safe_preview}
        except Exception as e:
            run.status = QueryRun.Status.FAILED
            run.error = str(e)
        finally:
            run.finished_at = datetime.now(tz=timezone.utc)
            run.save(update_fields=["status", "row_count", "preview", "error", "finished_at"])

        return Response(QueryRunSerializer(run).data)


class QueryHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        qs = QueryRun.objects.filter(tenant=tenant, user=request.user).order_by("-created_at")[:100]
        return Response(QueryRunSerializer(qs, many=True).data)

from django.shortcuts import render

# Create your views here.
