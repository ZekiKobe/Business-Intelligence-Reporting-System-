from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReportGroupAccessView, ReportGroupViewSet, ReportViewSet

router = DefaultRouter(trailing_slash=True)
router.register(r"report-groups", ReportGroupViewSet, basename="report-groups")
router.register(r"reports", ReportViewSet, basename="reports")

urlpatterns = [
    # Router provides `/report-groups/` and `/reports/` with trailing slash.
    path("", include(router.urls)),
    path("report-group-access/", ReportGroupAccessView.as_view(), name="report-group-access"),

    # Extra no-slash aliases (frontend uses POST without slash in some places).
    path("report-groups", ReportGroupViewSet.as_view({"get": "list", "post": "create"})),
    path("reports", ReportViewSet.as_view({"get": "list", "post": "create"})),
]

