from rest_framework import permissions, viewsets

from core.tenancy import resolve_tenant_for_user

from .models import Chart, Dashboard, Dataset
from .serializers import ChartSerializer, DashboardSerializer, DatasetSerializer


class TenantScopedQuerysetMixin:
    def get_tenant(self):
        return resolve_tenant_for_user(request=self.request, user=self.request.user).tenant

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant(), created_by=self.request.user)


class DatasetViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DatasetSerializer
    queryset = Dataset.objects.all().select_related("connection")
    lookup_field = "public_id"


class ChartViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChartSerializer
    queryset = Chart.objects.all().select_related("dataset")
    lookup_field = "public_id"


class DashboardViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DashboardSerializer
    queryset = Dashboard.objects.all().prefetch_related("charts")
    lookup_field = "public_id"

from django.shortcuts import render

# Create your views here.
