from datetime import datetime, timedelta, timezone

from django.core.management.base import BaseCommand

from querying.executor import execute_sql
from querying.models import QueryRun
from querying.sql_safety import ensure_readonly_sql
from scheduling.models import AlertEvent, Schedule


class Command(BaseCommand):
    help = "Run all active schedules whose next_run_at is due (simple cron substitute)."

    def handle(self, *args, **options):
        now = datetime.now(tz=timezone.utc)
        due = Schedule.objects.filter(is_active=True).filter(
            next_run_at__isnull=True
        ) | Schedule.objects.filter(is_active=True, next_run_at__lte=now)

        ran = 0
        for schedule in due:
            self.stdout.write(f"Running schedule {schedule.id} ({schedule.name})")
            ensure_readonly_sql(schedule.sql)
            tenant = schedule.tenant
            user = schedule.created_by

            run = QueryRun.objects.create(
                tenant=tenant,
                user=user,
                connection=schedule.connection,
                sql=schedule.sql,
                status=QueryRun.Status.RUNNING,
                started_at=now,
            )

            try:
                row_count, preview = execute_sql(connection=schedule.connection, sql=schedule.sql, limit=500)
                run.status = QueryRun.Status.SUCCEEDED
                run.row_count = row_count
                run.preview = {"rows": preview}
            except Exception as e:
                run.status = QueryRun.Status.FAILED
                run.error = str(e)
            finally:
                run.finished_at = datetime.now(tz=timezone.utc)
                run.save(update_fields=["status", "row_count", "preview", "error", "finished_at"])

            # Evaluate alerts
            for rule in schedule.alert_rules.filter(is_active=True):
                if rule.metric == "row_count" and run.row_count is not None:
                    val = float(run.row_count)
                    th = rule.threshold
                    op = rule.operator
                    triggered = (
                        (op == ">" and val > th)
                        or (op == ">=" and val >= th)
                        or (op == "<" and val < th)
                        or (op == "<=" and val <= th)
                        or (op == "==" and val == th)
                        or (op == "!=" and val != th)
                    )
                    if triggered:
                        msg = f"Alert '{rule.name}' triggered: {val} {op} {th}"
                        AlertEvent.objects.create(
                            tenant=tenant,
                            rule=rule,
                            query_run=run,
                            message=msg,
                        )
                        self.stdout.write(self.style.WARNING(msg))

            # Schedule next run
            schedule.last_run_at = now
            schedule.next_run_at = now + timedelta(minutes=schedule.interval_minutes)
            schedule.save(update_fields=["last_run_at", "next_run_at"])
            ran += 1

        self.stdout.write(self.style.SUCCESS(f"Ran {ran} schedules"))

