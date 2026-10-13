from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
import sqlite3
import tempfile

from connections.crypto import encrypt_json
from connections.engine import (
    _nessie_iceberg_base,
    _nessie_parse_warehouse_uri,
    _parse_iceberg_metadata_body,
    _s3_endpoint_for_boto,
    build_sqlalchemy_url,
)
from connections.models import DataConnection
from core.models import Membership, Tenant


User = get_user_model()


class ConnectionsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.user = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="pass12345",
        )
        Membership.objects.create(user=self.user, tenant=self.tenant, role=Membership.Role.ADMIN)
        self.client.force_authenticate(self.user)

    def test_create_and_test_sqlite_connection(self):
        db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        db_file.close()
        conn = sqlite3.connect(db_file.name)
        cur = conn.cursor()
        cur.execute("CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT)")
        cur.execute("CREATE VIEW v_customers AS SELECT id, name FROM customers")
        conn.commit()
        conn.close()

        res = self.client.post(
            "/api/v1/connections/",
            {"name": "local", "kind": "sqlite", "config": {"path": db_file.name}},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        public_id = res.data["public_id"]

        test_res = self.client.post(f"/api/v1/connections/{public_id}/test/")
        self.assertEqual(test_res.status_code, 200)
        self.assertTrue(test_res.data["ok"])

        schema_res = self.client.get(f"/api/v1/connections/{public_id}/schema/")
        self.assertEqual(schema_res.status_code, 200)
        names = [t["name"] for t in schema_res.data["tables"]]
        self.assertIn("customers", names)
        self.assertIn("v_customers", names)


class OracleUrlBuildTests(TestCase):
    def test_oracle_url_from_host_port_service(self):
        conn = DataConnection(
            kind=DataConnection.Kind.ORACLE,
            name="ora",
            config={"host": "db.example.com", "port": 1522, "database": "ORCLPDB"},
            secret_encrypted=encrypt_json({"user": "scott", "password": "tiger@x"}),
        )
        url = build_sqlalchemy_url(conn)
        self.assertTrue(url.startswith("oracle+oracledb://"))
        self.assertIn("db.example.com:1522/ORCLPDB", url)
        self.assertIn("scott", url)
        self.assertIn("tiger%40x", url)

    def test_oracle_explicit_dsn(self):
        conn = DataConnection(
            kind=DataConnection.Kind.ORACLE,
            name="ora",
            config={"dsn": "MYTNSALIAS"},
            secret_encrypted=encrypt_json({"user": "scott", "password": "tiger"}),
        )
        url = build_sqlalchemy_url(conn)
        self.assertEqual(
            url,
            "oracle+oracledb://scott:tiger@MYTNSALIAS",
        )


class S3EndpointForBotoTests(TestCase):
    def test_strips_bucket_path_from_endpoint(self):
        self.assertEqual(
            _s3_endpoint_for_boto("http://10.200.13.72:9000/iceberg-warehouse"),
            "http://10.200.13.72:9000",
        )

    def test_host_port_without_scheme(self):
        self.assertEqual(
            _s3_endpoint_for_boto("10.200.13.72:9000"),
            "http://10.200.13.72:9000",
        )


class NessieWarehouseParseTests(TestCase):
    def test_bucket_without_warehouse_uri(self):
        bucket, pfx = _nessie_parse_warehouse_uri({"bucket": "iceberg-warehouse"})
        self.assertEqual(bucket, "iceberg-warehouse")
        self.assertEqual(pfx, "")


class NessieIcebergBaseTests(TestCase):
    def test_derives_iceberg_from_api_v2_url(self):
        self.assertEqual(
            _nessie_iceberg_base({"nessie_url": "http://10.100.13.72:19120/api/v2"}),
            "http://10.100.13.72:19120/iceberg",
        )

    def test_explicit_catalog_uri_wins(self):
        self.assertEqual(
            _nessie_iceberg_base(
                {
                    "nessie_url": "http://x/api/v2",
                    "iceberg_catalog_uri": "http://custom/iceberg/main",
                }
            ),
            "http://custom/iceberg/main",
        )

    def test_does_not_double_append_iceberg(self):
        self.assertEqual(
            _nessie_iceberg_base({"nessie_url": "http://10.0.0.1:19120/iceberg"}),
            "http://10.0.0.1:19120/iceberg",
        )

    def test_branch_style_catalog_url_unchanged(self):
        self.assertEqual(
            _nessie_iceberg_base({"nessie_url": "http://h:19120/iceberg/main"}),
            "http://h:19120/iceberg/main",
        )


class IcebergMetadataParseTests(TestCase):
    def test_parse_v2_schema_fields(self):
        raw = b"""{
            "format-version": 2,
            "schemas": [
                {
                    "schema-id": 0,
                    "fields": [
                        {"id": 1, "name": "id", "type": "long"},
                        {"id": 2, "name": "data", "type": "string"}
                    ]
                }
            ],
            "current-schema-id": 0
        }"""
        cols = _parse_iceberg_metadata_body(raw)
        self.assertEqual([c["name"] for c in cols], ["id", "data"])
        self.assertEqual(cols[0]["type"], "long")
        self.assertEqual(cols[1]["type"], "string")
