from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("querying", "0003_queryrun_parameters")]

    operations = [
        migrations.AddField(
            model_name="queryrun",
            name="bound_parameters",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
