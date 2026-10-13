from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("querying", "0002_queryrun_duration_ms_and_more")]

    operations = [
        migrations.AddField(
            model_name="queryrun",
            name="parameters",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
