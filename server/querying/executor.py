from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from sqlalchemy import text

from connections.crypto import decrypt_json
from connections.engine import get_sqlalchemy_engine
from connections.models import DataConnection


def execute_sql(
    *, connection: DataConnection, sql: str, limit: Optional[int], parameters: Optional[Dict[str, Any]] = None
) -> Tuple[int, List[Dict[str, Any]]]:
    if connection.kind in {
        DataConnection.Kind.POSTGRES,
        DataConnection.Kind.MYSQL,
        DataConnection.Kind.MSSQL,
        DataConnection.Kind.ORACLE,
        DataConnection.Kind.SQLITE,
    }:
        default_cap = int(getattr(settings, "QUERY_SQL_DEFAULT_ROW_LIMIT", 10_000))
        effective_limit = default_cap if limit is None else int(limit)
        engine = get_sqlalchemy_engine(connection)
        with engine.connect() as c:
            result = c.execution_options(stream_results=True).execute(text(sql), parameters or {})
            rows = result.fetchmany(size=effective_limit)
            cols = list(result.keys())
        data = [dict(zip(cols, row)) for row in rows]
        return len(data), data

    if connection.kind == DataConnection.Kind.CLICKHOUSE:
        import clickhouse_connect

        default_cap = int(getattr(settings, "QUERY_SQL_DEFAULT_ROW_LIMIT", 10_000))
        cap = default_cap if limit is None else int(limit)
        cfg = connection.config or {}
        secret = decrypt_json(connection.secret_encrypted)
        client = clickhouse_connect.get_client(
            host=cfg.get("host", "localhost"),
            port=cfg.get("port", 8123),
            username=secret.get("user"),
            password=secret.get("password"),
            database=cfg.get("database"),
            secure=bool(cfg.get("secure", False)),
        )
        result = client.query(sql)
        cols = result.column_names
        rows = result.result_rows[:cap]
        data = [dict(zip(cols, row)) for row in rows]
        return len(data), data

    raise ValueError(f"SQL execution not implemented for kind={connection.kind}")

