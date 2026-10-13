from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Membership, Tenant
from reporting.models import ReportGroup, UserReportGroupAccess


User = get_user_model()


class ReportingApiTests(TestCase):
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

    def test_create_and_list_report_groups(self):
        create = self.client.post(
            "/api/report-groups/",
            {"group_name": "Finance", "description": "Finance reports"},
            format="json",
        )
        self.assertEqual(create.status_code, 201)

        res = self.client.get("/api/report-groups/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_delete_report_group_by_code(self):
        g = ReportGroup.objects.create(
            tenant=self.tenant, group_name="Finance", description="Finance reports"
        )
        res = self.client.delete(f"/api/report-groups/{g.code}/")
        self.assertEqual(res.status_code, 204)

    def test_viewer_sees_only_assigned_report_groups(self):
        viewer = User.objects.create_user(username="vic", email="vic@example.com", password="pass12345")
        Membership.objects.create(user=viewer, tenant=self.tenant, role=Membership.Role.VIEWER)
        g1 = ReportGroup.objects.create(tenant=self.tenant, group_name="Assigned")
        ReportGroup.objects.create(tenant=self.tenant, group_name="Other")
        UserReportGroupAccess.objects.create(user=viewer, report_group=g1)

        self.client.force_authenticate(viewer)
        res = self.client.get("/api/report-groups/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["group_name"], "Assigned")

    def test_admin_can_assign_viewer_report_groups(self):
        viewer = User.objects.create_user(username="vic2", email="vic2@example.com", password="pass12345")
        Membership.objects.create(user=viewer, tenant=self.tenant, role=Membership.Role.VIEWER)
        g1 = ReportGroup.objects.create(tenant=self.tenant, group_name="RG1")

        res = self.client.put(
            "/api/report-group-access/",
            {"user_id": viewer.id, "report_group_codes": [str(g1.code)]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(UserReportGroupAccess.objects.filter(user=viewer).count(), 1)

    def test_viewer_cannot_call_report_group_access_api(self):
        viewer = User.objects.create_user(username="vic3", email="vic3@example.com", password="pass12345")
        Membership.objects.create(user=viewer, tenant=self.tenant, role=Membership.Role.VIEWER)
        g1 = ReportGroup.objects.create(tenant=self.tenant, group_name="RGx")
        self.client.force_authenticate(viewer)
        res = self.client.put(
            "/api/report-group-access/",
            {"user_id": viewer.id, "report_group_codes": [str(g1.code)]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_viewer_cannot_create_report_group(self):
        viewer = User.objects.create_user(username="vic4", email="vic4@example.com", password="pass12345")
        Membership.objects.create(user=viewer, tenant=self.tenant, role=Membership.Role.VIEWER)
        self.client.force_authenticate(viewer)
        res = self.client.post(
            "/api/report-groups/",
            {"group_name": "Nope", "description": ""},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
