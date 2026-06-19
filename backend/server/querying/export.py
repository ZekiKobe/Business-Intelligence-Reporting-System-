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

        rows = (run.preview or {}).get("rows") or []
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        resp = HttpResponse(output.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="queryrun-{run_id}.csv"'
        return resp

