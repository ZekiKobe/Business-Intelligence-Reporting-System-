from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AlertRuleViewSet, ScheduleViewSet

router = DefaultRouter()
router.register(r"schedules", ScheduleViewSet, basename="schedules")
router.register(r"alerts", AlertRuleViewSet, basename="alerts")

urlpatterns = [
    path("v1/", include(router.urls)),
]

