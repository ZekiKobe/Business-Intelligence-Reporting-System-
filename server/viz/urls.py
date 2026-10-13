from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChartViewSet, DashboardViewSet, DatasetViewSet

router = DefaultRouter()
router.register(r"datasets", DatasetViewSet, basename="datasets")
router.register(r"charts", ChartViewSet, basename="charts")
router.register(r"dashboards", DashboardViewSet, basename="dashboards")

urlpatterns = [
    path("v1/", include(router.urls)),
]

