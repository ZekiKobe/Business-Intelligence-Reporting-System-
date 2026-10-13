from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.db.models import QuerySet
from rest_framework.request import Request

from .models import Membership, Tenant, User


TENANT_HEADER = "HTTP_X_TENANT_SLUG"


@dataclass(frozen=True)
class TenantContext:
    tenant: Tenant
    membership: Optional[Membership]


def get_tenant_slug_from_request(request: Request) -> Optional[str]:
    # Prefer explicit header, else JWT claim if present.
    slug = request.META.get(TENANT_HEADER)
    if slug:
        return slug

    auth = getattr(request, "auth", None)
    if isinstance(auth, dict):
        return auth.get("tenant_slug")

    # SimpleJWT uses token objects, but request.auth is not reliably dict-like here.
    return None


def resolve_tenant_for_user(
    *, request: Request, user: User, fallback_to_first: bool = True
) -> TenantContext:
    slug = get_tenant_slug_from_request(request)

    qs: QuerySet[Membership] = Membership.objects.select_related("tenant").filter(user=user)
    if slug:
        membership = qs.filter(tenant__slug=slug).first()
        if membership:
            return TenantContext(tenant=membership.tenant, membership=membership)

    membership = qs.order_by("created_at").first() if fallback_to_first else None
    if membership:
        return TenantContext(tenant=membership.tenant, membership=membership)

    # Bootstrap: create a default tenant and membership for first-time setups.
    tenant, _ = Tenant.objects.get_or_create(slug="default", defaults={"name": "Default"})
    membership = Membership.objects.create(user=user, tenant=tenant, role=Membership.Role.ADMIN)
    return TenantContext(tenant=tenant, membership=membership)

