import csv
import io

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.tenancy import resolve_tenant_for_user

from .models import QueryRun


class QueryRunCsvExportView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, run_id: int):
        tenant = resolve_tenant_for_user(request=request, user=request.user).tenant
        run = QueryRun.objects.filter(id=run_id, tenant=tenant, user=request.user).first()
        if not run:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if run.status != QueryRun.Status.SUCCEEDED:
            return Response({"detail": "Only completed runs can be exported."}, status=status.HTTP_409_CONFLICT)

        rows = (run.preview or {}).get("rows") or []
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            for row in rows:
                writer.writerow({key: _csv_safe(value) for key, value in row.items()})
        resp = HttpResponse(output.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="queryrun-{run_id}.csv"'
        return resp


def _csv_safe(value):
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@"):
        return "'" + value
    return value

