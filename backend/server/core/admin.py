from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Membership, Tenant, TenantBranding, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Profile", {"fields": ("full_name",)}),
    )


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "is_active", "created_at")
    search_fields = ("name", "slug")


@admin.register(TenantBranding)
class TenantBrandingAdmin(admin.ModelAdmin):
    list_display = ("tenant", "company_name", "product_name", "updated_at")
    search_fields = ("tenant__slug", "company_name", "product_name")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "user", "role", "status", "created_at")
    list_filter = ("role", "status")
    search_fields = ("tenant__name", "tenant__slug", "user__username", "user__email")
