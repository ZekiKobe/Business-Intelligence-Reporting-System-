from django.urls import path

from .export import QueryRunCsvExportView
from .views import QueryHistoryView, ReportExecuteView, SqlExecuteView


urlpatterns = [
    path("v1/sql/execute", SqlExecuteView.as_view(), name="sql-execute"),
    path("v1/reports/<int:report_id>/execute", ReportExecuteView.as_view(), name="report-execute"),
    path("v1/sql/history", QueryHistoryView.as_view(), name="sql-history"),
    path("v1/query-runs/<int:run_id>/export.csv", QueryRunCsvExportView.as_view(), name="queryrun-export-csv"),
]

