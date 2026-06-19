from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from connections.models import DataConnection
from core.models import Membership, Tenant
from querying.models import QueryRun
from scheduling.management.commands.run_due_schedules import Command as RunSchedulesCommand
from scheduling.models import AlertEvent, AlertRule, Schedule


User = get_user_model()


class SchedulingApiTests(TestCase):
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

    def test_create_schedule_and_run_now(self):
        res = self.client.post(
            "/api/v1/schedules/",
            {
                "name": "Test schedule",
                "connection": self.conn.id,
                "sql": "SELECT 1 as one",
                "interval_minutes": 5,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        sched_id = res.data["id"]

        run = self.client.post(f"/api/v1/schedules/{sched_id}/run_now/")
        self.assertEqual(run.status_code, 200)
        self.assertEqual(run.data["status"], "succeeded")

    def test_due_schedules_command_and_alert(self):
        now = timezone.now()
        schedule = Schedule.objects.create(
            tenant=self.tenant,
            name="Alert schedule",
            connection=self.conn,
            sql="SELECT 1 as one",
            interval_minutes=5,
            is_active=True,
            next_run_at=now - timedelta(minutes=1),
            created_by=self.user,
        )
        AlertRule.objects.create(
            tenant=self.tenant,
            name="Row count > 0",
            schedule=schedule,
            metric="row_count",
            operator=">",
            threshold=0,
            created_by=self.user,
        )

        cmd = RunSchedulesCommand()
        cmd.handle()

        self.assertGreaterEqual(QueryRun.objects.filter(tenant=self.tenant).count(), 1)
        self.assertGreaterEqual(AlertEvent.objects.filter(tenant=self.tenant).count(), 1)

# Create your tests here.
