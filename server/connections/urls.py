from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DataConnectionViewSet

router = DefaultRouter()
router.register(r"connections", DataConnectionViewSet, basename="connections")

urlpatterns = [
    path("v1/", include(router.urls)),
]

