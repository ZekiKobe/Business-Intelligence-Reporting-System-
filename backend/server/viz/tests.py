from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from connections.models import DataConnection
from core.models import Membership, Tenant


User = get_user_model()


class VizApiTests(TestCase):
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

    def test_dataset_chart_dashboard_crud(self):
        ds = self.client.post(
            "/api/v1/datasets/",
            {"name": "Sales", "connection": self.conn.id, "kind": "sql", "definition": {"sql": "SELECT 1"}},
            format="json",
        )
        self.assertEqual(ds.status_code, 201)

        chart = self.client.post(
            "/api/v1/charts/",
            {"name": "C1", "dataset": ds.data["id"], "viz_type": "table", "spec": {"columns": ["one"]}},
            format="json",
        )
        self.assertEqual(chart.status_code, 201)

        dash = self.client.post(
            "/api/v1/dashboards/",
            {"name": "D1", "charts": [chart.data["id"]], "layout": {"items": []}, "filters": {}},
            format="json",
        )
        self.assertEqual(dash.status_code, 201)
from django.test import TestCase

# Create your tests here.
