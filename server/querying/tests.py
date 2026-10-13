from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from connections.models import DataConnection
from core.models import Membership, Tenant
from reporting.models import Report, ReportGroup, UserReportGroupAccess


User = get_user_model()


class SqlExecuteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="pass12345",
        )
        Membership.objects.create(user=self.user, tenant=self.tenant, role=Membership.Role.ADMIN)
        self.client.force_authenticate(self.user)
        self.conn = DataConnection.objects.create(
            tenant=self.tenant, name="local", kind=DataConnection.Kind.SQLITE, config={"path": ":memory:"}
        )

    def test_sql_execute_select(self):
        res = self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "SELECT 1 as one", "limit": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "succeeded")

    def test_sql_execute_rejects_ddl(self):
        res = self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "DROP TABLE x"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_sql_execute_requires_select_statement(self):
        res = self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "PRAGMA database_list"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_sql_execute_allows_forbidden_words_inside_a_literal(self):
        res = self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "SELECT 'drop' AS label"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "succeeded")

    def test_viewer_cannot_use_direct_sql_and_saved_reports_validate_metadata(self):
        viewer = User.objects.create_user(username="viewer", email="viewer@example.com", password="pass12345")
        Membership.objects.create(user=viewer, tenant=self.tenant, role=Membership.Role.VIEWER)
        group = ReportGroup.objects.create(tenant=self.tenant, group_name="Operations")
        UserReportGroupAccess.objects.create(user=viewer, report_group=group)
        report = Report.objects.create(
            tenant=self.tenant, group=group, report_id="ops-1", name="Operations",
            dataset="safe_table;drop", spec={"connection_public_id": str(self.conn.public_id), "table": "safe_table;drop"},
        )
        self.client.force_authenticate(viewer)
        direct = self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "SELECT 1"}, format="json",
        )
        self.assertEqual(direct.status_code, 403)
        saved = self.client.post(f"/api/v1/reports/{report.id}/execute", {"limit": 10}, format="json")
        self.assertEqual(saved.status_code, 400)

    def test_history_does_not_expose_sql_or_preview(self):
        self.client.post(
            "/api/v1/sql/execute",
            {"connection_id": str(self.conn.public_id), "sql": "SELECT 1 as one", "limit": 10},
            format="json",
        )
        history = self.client.get("/api/v1/sql/history")
        self.assertEqual(history.status_code, 200)
        self.assertNotIn("sql", history.data[0])
        self.assertNotIn("preview", history.data[0])

    def test_saved_report_enforces_configured_required_filter(self):
        group = ReportGroup.objects.create(tenant=self.tenant, group_name="Required filters")
        report = Report.objects.create(
            tenant=self.tenant,
            group=group,
            report_id="required-1",
            name="Required filter report",
            dataset="safe_table",
            spec={
                "connection_public_id": str(self.conn.public_id),
                "table": "safe_table",
                "filter_columns": ["business_date"],
                "filter_configs": [
                    {"key": "business_date", "label": "Business date", "required": True, "type": "date"}
                ],
            },
        )
        missing = self.client.post(f"/api/v1/reports/{report.id}/execute", {}, format="json")
        self.assertEqual(missing.status_code, 400)
        self.assertIn("Business date is required", missing.data["detail"])

# Create your tests here.
