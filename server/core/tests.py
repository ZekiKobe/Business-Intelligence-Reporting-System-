from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Membership, Tenant


User = get_user_model()


class ExternalLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="pass12345",
        )
        Membership.objects.create(user=self.user, tenant=self.tenant, role=Membership.Role.ADMIN)

    def test_external_login_returns_session_id(self):
        res = self.client.post(
            "/api/external-login/",
            {"username": "alice", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("sessionId", res.data)
        self.assertIn("access_token", res.cookies)

    def test_auth_register_forbidden_and_login_alias_works(self):
        reg = self.client.post(
            "/api/auth/register/",
            {
                "name": "Bob",
                "email": "bob@example.com",
                "password": "pass12345",
            },
            format="json",
        )
        self.assertEqual(reg.status_code, 403)
        self.assertIn("detail", reg.data)

        login = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("sessionId", login.data)

    def test_admin_can_create_and_remove_viewer_with_username_login(self):
        self.client.force_authenticate(user=self.user)
        created = self.client.post(
            "/api/user",
            {
                "name": "Viewer User",
                "username": "reportviewer",
                "email": "viewer@example.com",
                "password": "pass12345",
                "role": "Viewer",
                "status": "Active",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["username"], "reportviewer")

        self.client.force_authenticate(user=None)
        login = self.client.post(
            "/api/auth/login/",
            {"username": "reportviewer", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        self.client.force_authenticate(user=self.user)
        removed = self.client.delete(f"/api/user/{created.data['id']}/")
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(User.objects.filter(id=created.data["id"]).exists())

    def test_admin_creation_supports_legacy_payload_without_username(self):
        self.client.force_authenticate(user=self.user)
        created = self.client.post(
            "/api/user",
            {
                "name": "Legacy Viewer",
                "email": "legacy.viewer@example.com",
                "password": "pass12345",
                "role": "Viewer",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["username"], "legacy.viewer")

    def test_current_user_returns_the_authenticated_users_identity(self):
        self.user.full_name = "Alice Example"
        self.user.save(update_fields=["full_name"])
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/user/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["username"], "alice")
        self.assertEqual(response.data["fullName"], "Alice Example")
        self.assertEqual(response.data["email"], "alice@example.com")

# Create your tests here.
