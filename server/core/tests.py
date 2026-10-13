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

# Create your tests here.
