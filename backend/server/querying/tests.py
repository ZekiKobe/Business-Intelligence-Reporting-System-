from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from connections.models import DataConnection
from core.models import Membership, Tenant


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

# Create your tests here.
