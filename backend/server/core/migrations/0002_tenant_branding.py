# Generated manually for TenantBranding

from django.db import migrations, models
import django.db.models.deletion


def create_branding_for_tenants(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")
    TenantBranding = apps.get_model("core", "TenantBranding")
    for tenant in Tenant.objects.all():
        TenantBranding.objects.get_or_create(tenant=tenant, defaults={})


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantBranding",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(default="Your Company", max_length=200)),
                ("product_name", models.CharField(default="BI Studio", max_length=200)),
                (
                    "tagline",
                    models.CharField(blank=True, default="Modern analytics workspace", max_length=500),
                ),
                ("logo_url", models.CharField(blank=True, default="/images/logo1.ico", max_length=2000)),
                ("primary_color", models.CharField(default="#2563eb", max_length=32)),
                ("accent_color", models.CharField(default="#14b8a6", max_length=32)),
                ("dark_mode", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branding",
                        to="core.tenant",
                    ),
                ),
            ],
        ),
        migrations.RunPython(create_branding_for_tenants, noop_reverse),
    ]
