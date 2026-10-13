from django.contrib.auth.models import AbstractUser
from django.db import models


class Tenant(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class User(AbstractUser):
    full_name = models.CharField(max_length=200, blank=True)
    # Keep username-based auth compatible with the existing frontends,
    # but require unique email as well for admin/enterprise patterns.
    email = models.EmailField(unique=True, blank=True, null=True)

    def __str__(self) -> str:  # pragma: no cover
        return self.get_username()


class TenantBranding(models.Model):
    """White-label settings shared by BI Dashboard and the viewer portal (per tenant)."""

    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="branding")
    company_name = models.CharField(max_length=200, default="Your Company")
    product_name = models.CharField(max_length=200, default="BI Studio")
    tagline = models.CharField(max_length=500, blank=True, default="Modern analytics workspace")
    logo_url = models.CharField(max_length=2000, blank=True, default="/images/logo1.ico")
    primary_color = models.CharField(max_length=32, default="#2563eb")
    accent_color = models.CharField(max_length=32, default="#14b8a6")
    dark_mode = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"Branding ({self.tenant.slug})"


class Membership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "Admin", "Admin"
        EDITOR = "Editor", "Editor"
        VIEWER = "Viewer", "Viewer"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "tenant")

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user} @ {self.tenant} ({self.role})"
