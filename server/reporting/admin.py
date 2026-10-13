from django.contrib import admin

from .models import Report, ReportGroup, UserReportGroupAccess


@admin.register(ReportGroup)
class ReportGroupAdmin(admin.ModelAdmin):
    list_display = ("group_name", "tenant", "code", "created_at")
    search_fields = ("group_name",)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("name", "report_id", "tenant", "group", "updated_at")
    search_fields = ("name", "report_id")


@admin.register(UserReportGroupAccess)
class UserReportGroupAccessAdmin(admin.ModelAdmin):
    list_display = ("user", "report_group", "created_at")
    raw_id_fields = ("user", "report_group")
