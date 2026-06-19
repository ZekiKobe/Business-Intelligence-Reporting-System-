from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.tenancy import resolve_tenant_for_user

from .engine import dispose_sqlalchemy_engine, get_connection_schema, test_connection
from .models import DataConnection
from .serializers import ConnectionTestResultSerializer, DataConnectionSerializer


class TenantScopedQuerysetMixin:
    def get_tenant(self):
        return resolve_tenant_for_user(request=self.request, user=self.request.user).tenant

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self.get_tenant())

    def perform_create(self, serializer):
        serializer.save(tenant=self.get_tenant())


class DataConnectionViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DataConnectionSerializer
    queryset = DataConnection.objects.all()
    lookup_field = "public_id"

    def perform_destroy(self, instance):
        dispose_sqlalchemy_engine(instance.public_id)
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def test(self, request, public_id=None):
        conn = self.get_object()
        ok, message = test_connection(conn)
        payload = {"ok": ok, "message": message}
        return Response(ConnectionTestResultSerializer(payload).data)

    @action(detail=True, methods=["get"])
    def schema(self, request, public_id=None):
        conn = self.get_object()
        try:
            payload = get_connection_schema(conn)
            return Response(payload)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
