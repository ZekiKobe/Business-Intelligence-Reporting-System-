from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Membership, Tenant


class Command(BaseCommand):
    help = "Seed a default tenant + admin and viewer users for local development"

    def handle(self, *args, **options):
        tenant, _ = Tenant.objects.get_or_create(slug="default", defaults={"name": "Default"})

        User = get_user_model()
        admin_email = "admin@example.com"
        admin_username = "admin"
        admin_password = "admin12345"

        admin_user, admin_created = User.objects.get_or_create(
            username=admin_username,
            defaults={"email": admin_email, "is_staff": True, "is_superuser": True},
        )
        if admin_created:
            admin_user.set_password(admin_password)
            admin_user.save(update_fields=["password"])
        else:
            # Keep seeded admin credentials predictable for local/dev.
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.email = admin_email
            admin_user.set_password(admin_password)
            admin_user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        Membership.objects.get_or_create(
            user=admin_user,
            tenant=tenant,
            defaults={"role": Membership.Role.ADMIN, "status": "Active"},
        )

        viewer_email = "viewer@example.com"
        viewer_username = "viewer"
        viewer_password = "viewer12345"

        viewer_user, viewer_created = User.objects.get_or_create(
            username=viewer_username,
            defaults={
                "email": viewer_email,
                "is_staff": False,
                "is_superuser": False,
                "full_name": "Report Viewer",
            },
        )
        if viewer_created:
            viewer_user.set_password(viewer_password)
            viewer_user.save(update_fields=["password"])
        else:
            viewer_user.email = viewer_email
            viewer_user.is_staff = False
            viewer_user.is_superuser = False
            viewer_user.set_password(viewer_password)
            viewer_user.save(update_fields=["email", "is_staff", "is_superuser", "password"])

        Membership.objects.get_or_create(
            user=viewer_user,
            tenant=tenant,
            defaults={"role": Membership.Role.VIEWER, "status": "Active"},
        )

        self.stdout.write(self.style.SUCCESS("Seed complete"))
        self.stdout.write(f"Tenant: {tenant.slug}")
        self.stdout.write(f"Admin: {admin_username} / {admin_password}")
        self.stdout.write(f"Viewer: {viewer_username} / {viewer_password}")
