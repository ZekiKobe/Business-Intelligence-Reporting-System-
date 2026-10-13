from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("connections", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dataconnection",
            name="kind",
            field=models.CharField(
                choices=[
                    ("postgres", "PostgreSQL"),
                    ("mysql", "MySQL/MariaDB"),
                    ("mssql", "SQL Server"),
                    ("oracle", "Oracle"),
                    ("snowflake", "Snowflake"),
                    ("bigquery", "BigQuery"),
                    ("clickhouse", "ClickHouse"),
                    ("sqlite", "SQLite"),
                    ("s3", "S3"),
                    ("nessie", "Nessie / Iceberg REST"),
                ],
                max_length=40,
            ),
        ),
    ]
