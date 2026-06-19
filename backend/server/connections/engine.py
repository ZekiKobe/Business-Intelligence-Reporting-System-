from __future__ import annotations

import hashlib
import json
import logging
import re
import warnings
from threading import RLock
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, quote_plus, unquote, urlparse

from django.conf import settings
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SAWarning
from sqlalchemy.pool import NullPool

from .crypto import decrypt_json
from .models import DataConnection

logger = logging.getLogger(__name__)

_engine_lock = RLock()
# public_id (str) -> (url_sha256, Engine)
_sqlalchemy_engine_cache: Dict[str, Tuple[str, Any]] = {}


def get_sqlalchemy_engine(conn: DataConnection) -> Any:
    """
    Reuse a pooled Engine per DataConnection to avoid new TCP/auth + pool on every query.
    Cache is invalidated when the connection URL changes (e.g. password update).
    """
    url = build_sqlalchemy_url(conn)
    url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()
    key = str(conn.public_id)
    with _engine_lock:
        cached = _sqlalchemy_engine_cache.get(key)
        if cached and cached[0] == url_hash:
            return cached[1]
        if cached:
            try:
                cached[1].dispose()
            except Exception:
                pass

    kwargs: Dict[str, Any] = {"pool_pre_ping": True}
    if conn.kind == DataConnection.Kind.SQLITE:
        kwargs["poolclass"] = NullPool
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = getattr(settings, "SQLALCHEMY_POOL_SIZE", 5)
        kwargs["max_overflow"] = getattr(settings, "SQLALCHEMY_MAX_OVERFLOW", 10)
        kwargs["pool_recycle"] = getattr(settings, "SQLALCHEMY_POOL_RECYCLE", 3600)
    if conn.kind == DataConnection.Kind.ORACLE:
        kwargs["arraysize"] = getattr(settings, "SQLALCHEMY_ORACLE_ARRAYSIZE", 500)

    engine = create_engine(url, **kwargs)
    with _engine_lock:
        _sqlalchemy_engine_cache[key] = (url_hash, engine)
    return engine


def dispose_sqlalchemy_engine(public_id) -> None:
    """Dispose pooled engine when a data connection is deleted."""
    key = str(public_id)
    with _engine_lock:
        cached = _sqlalchemy_engine_cache.pop(key, None)
    if cached:
        try:
            cached[1].dispose()
        except Exception:
            pass


def build_sqlalchemy_url(conn: DataConnection) -> str:
    cfg = conn.config or {}
    secret = decrypt_json(conn.secret_encrypted)

    if conn.kind == DataConnection.Kind.POSTGRES:
        user = quote_plus(str(secret.get("user") or ""))
        password = quote_plus(str(secret.get("password") or ""))
        host = cfg.get("host", "localhost")
        port = cfg.get("port", 5432)
        db = cfg.get("database")
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

    if conn.kind == DataConnection.Kind.MYSQL:
        user = quote_plus(str(secret.get("user") or ""))
        password = quote_plus(str(secret.get("password") or ""))
        host = cfg.get("host", "localhost")
        port = cfg.get("port", 3306)
        db = cfg.get("database")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"

    if conn.kind == DataConnection.Kind.MSSQL:
        # Requires ODBC driver installed on machine.
        user = quote_plus(str(secret.get("user") or ""))
        password = quote_plus(str(secret.get("password") or ""))
        host = cfg.get("host", "localhost")
        port = cfg.get("port", 1433)
        db = cfg.get("database")
        driver = cfg.get("driver", "ODBC Driver 18 for SQL Server")
        return (
            f"mssql+pyodbc://{user}:{password}@{host},{port}/{db}"
            f"?driver={driver.replace(' ', '+')}&TrustServerCertificate=yes"
        )

    if conn.kind == DataConnection.Kind.ORACLE:
        user = quote_plus(str(secret.get("user") or ""))
        password = quote_plus(str(secret.get("password") or ""))
        # Full easy-connect or TNS alias (optional; overrides host/port/database)
        explicit = (cfg.get("dsn") or "").strip()
        if explicit:
            # e.g. localhost:1521/ORCL, //host/service, or TNS name
            host_spec = explicit
        else:
            host_part = (cfg.get("host") or "").strip()
            service = (cfg.get("database") or "").strip()
            if not host_part:
                raise ValueError(
                    "Oracle: set Host and Database (service name), or set config.dsn "
                    "(e.g. hostname:1521/ORCL)."
                )
            if not service:
                raise ValueError(
                    "Oracle: Database field must be the service name (or PDB name), "
                    "or set config.dsn."
                )
            port_raw = cfg.get("port")
            port = int(port_raw) if port_raw not in (None, "") else 1521
            # SQLAlchemy / python-oracledb easy connect: host:port/service_name
            host_spec = f"{host_part}:{port}/{service}"
        return f"oracle+oracledb://{user}:{password}@{host_spec}"

    if conn.kind == DataConnection.Kind.SQLITE:
        path = cfg.get("path", ":memory:")
        return f"sqlite:///{path}"

    raise ValueError(f"SQLAlchemy URL not supported for kind={conn.kind}")


def _sqlalchemy_heartbeat_sql(kind: str) -> str:
    """Dialect-appropriate trivial query for connection tests (and similar)."""
    if kind == DataConnection.Kind.ORACLE:
        return "SELECT 1 FROM DUAL"
    return "SELECT 1"


def _nessie_catalog_unreachable_message(catalog_config_url: str, exc: BaseException) -> str:
    parsed = urlparse(catalog_config_url)
    host = parsed.hostname or "(unknown host)"
    port = parsed.port or (443 if (parsed.scheme or "").lower() == "https" else 80)
    return (
        f"Cannot reach Nessie Iceberg REST at {catalog_config_url}\n"
        f"Error: {exc}\n\n"
        f"The app talks to Nessie ({host}:{port}) and to MinIO/S3 as two separate connections from the machine "
        f"running this Django server. Warehouse URL, bucket, and keys do not proxy or replace the Nessie URL — both must be reachable where the backend runs.\n\n"
        f"WinError 10065 / 'unreachable host' usually means no network route from this PC to {host} "
        f"(wrong subnet, Nessie only inside Docker/K8s/VPN, firewall, or Nessie not listening). "
        f"Connect VPN, adjust routing, open the port, or run the BI server on a host that can reach Nessie.\n\n"
        f"Sanity checks from this machine: ping or Test-NetConnection {host} -Port {port}"
    )


def _test_nessie_connection(conn: DataConnection) -> Tuple[bool, str]:
    import requests

    cfg = conn.config or {}
    base = _nessie_iceberg_base(cfg)
    catalog_config_url = f"{base}/v1/config"
    session = _nessie_rest_session(conn)

    catalog_ok = False
    catalog_detail = ""
    try:
        r = session.get(catalog_config_url, timeout=15)
        if r.status_code >= 400:
            catalog_detail = (
                f"GET {catalog_config_url} returned HTTP {r.status_code}: {r.text[:400]}"
            )
        else:
            catalog_ok = True
    except requests.exceptions.Timeout as e:
        catalog_detail = _nessie_catalog_unreachable_message(catalog_config_url, e)
    except requests.exceptions.ConnectionError as e:
        catalog_detail = _nessie_catalog_unreachable_message(catalog_config_url, e)
    except Exception as e:
        catalog_detail = _nessie_catalog_unreachable_message(catalog_config_url, e)

    storage_ok = False
    storage_detail = ""
    try:
        bucket, _pfx = _nessie_parse_warehouse_uri(cfg)
        _nessie_s3_client(conn).head_bucket(Bucket=bucket)
        storage_ok = True
    except ValueError as e:
        storage_detail = str(e)
    except Exception as e_msg:
        storage_detail = str(e_msg)

    if catalog_ok and storage_ok:
        return (
            True,
            "Connection OK — Iceberg REST catalog and object storage (bucket) are both reachable from this server.",
        )
    if catalog_ok and not storage_ok:
        return (
            False,
            "Nessie Iceberg catalog responded OK, but object storage (MinIO/S3) check failed.\n\n"
            f"{storage_detail}",
        )
    if not catalog_ok and storage_ok:
        return (
            False,
            f"{catalog_detail}\n\n"
            "---\n"
            "Object storage check passed: MinIO endpoint, bucket, and keys work from this server. "
            "Only the Nessie host is unreachable from here — fix network path to Nessie, not warehouse settings.",
        )
    return (
        False,
        f"Nessie catalog:\n{catalog_detail}\n\nObject storage:\n{storage_detail}",
    )


def test_connection(conn: DataConnection) -> Tuple[bool, str]:
    try:
        if conn.kind in {
            DataConnection.Kind.POSTGRES,
            DataConnection.Kind.MYSQL,
            DataConnection.Kind.MSSQL,
            DataConnection.Kind.ORACLE,
            DataConnection.Kind.SQLITE,
        }:
            engine = get_sqlalchemy_engine(conn)
            ping = _sqlalchemy_heartbeat_sql(conn.kind)
            with engine.connect() as c:
                c.execute(text(ping))
            return True, "Connection OK"

        if conn.kind == DataConnection.Kind.CLICKHOUSE:
            import clickhouse_connect

            cfg = conn.config or {}
            secret = decrypt_json(conn.secret_encrypted)
            client = clickhouse_connect.get_client(
                host=cfg.get("host", "localhost"),
                port=cfg.get("port", 8123),
                username=secret.get("user"),
                password=secret.get("password"),
                database=cfg.get("database"),
                secure=bool(cfg.get("secure", False)),
            )
            client.command("SELECT 1")
            return True, "Connection OK"

        if conn.kind == DataConnection.Kind.SNOWFLAKE:
            import snowflake.connector

            cfg = conn.config or {}
            secret = decrypt_json(conn.secret_encrypted)
            ctx = snowflake.connector.connect(
                user=secret.get("user"),
                password=secret.get("password"),
                account=cfg.get("account"),
                warehouse=cfg.get("warehouse"),
                database=cfg.get("database"),
                schema=cfg.get("schema"),
                role=cfg.get("role"),
            )
            cs = ctx.cursor()
            try:
                cs.execute("SELECT 1")
                cs.fetchone()
            finally:
                cs.close()
                ctx.close()
            return True, "Connection OK"

        if conn.kind == DataConnection.Kind.BIGQUERY:
            from google.cloud import bigquery

            cfg = conn.config or {}
            secret = decrypt_json(conn.secret_encrypted)
            # secret may contain service_account_json or rely on GOOGLE_APPLICATION_CREDENTIALS
            if secret.get("service_account_json"):
                from google.oauth2 import service_account

                creds = service_account.Credentials.from_service_account_info(
                    secret["service_account_json"]
                )
                client = bigquery.Client(project=cfg.get("project"), credentials=creds)
            else:
                client = bigquery.Client(project=cfg.get("project"))
            list(client.list_datasets(max_results=1))
            return True, "Connection OK"

        if conn.kind == DataConnection.Kind.S3:
            _s3_client(conn).head_bucket(Bucket=_s3_resolve_bucket(conn.config or {}))
            return True, "Connection OK"

        if conn.kind == DataConnection.Kind.NESSIE:
            return _test_nessie_connection(conn)

        return False, f"Unsupported connection kind: {conn.kind}"
    except Exception as e:  # pragma: no cover
        return False, str(e)


def _reflectable_object_names(insp: Any, schema: Optional[str]) -> List[str]:
    """
    Table and view names for the schema browser. SQLAlchemy's get_table_names()
    returns physical tables only; views (common on Oracle/PostgreSQL/SQL Server)
    come from get_view_names().
    """
    if schema:
        tables = list(insp.get_table_names(schema=schema))
        views: List[str] = []
        get_views = getattr(insp, "get_view_names", None)
        if callable(get_views):
            try:
                views = list(get_views(schema=schema))
            except (NotImplementedError, TypeError):
                views = []
    else:
        tables = list(insp.get_table_names())
        views = []
        get_views = getattr(insp, "get_view_names", None)
        if callable(get_views):
            try:
                views = list(get_views())
            except (NotImplementedError, TypeError):
                views = []

    seen: set[str] = set()
    ordered: List[str] = []
    for name in tables + views:
        if name in seen:
            continue
        seen.add(name)
        ordered.append(name)
    return ordered


def _oracle_format_data_dictionary_type(row: Dict[str, Any]) -> str:
    """Build a readable SQL type from ALL_TAB_COLUMNS / USER_TAB_COLUMNS metadata."""
    dt = (row.get("data_type") or "").upper()
    if not dt:
        return "UNKNOWN"
    if dt == "NUMBER":
        p, s = row.get("data_precision"), row.get("data_scale")
        try:
            p_i = int(p) if p is not None else None
            s_i = int(s) if s is not None else None
        except (TypeError, ValueError):
            p_i, s_i = None, None
        if p_i is not None and s_i is not None and s_i > 0:
            return f"NUMBER({p_i},{s_i})"
        if p_i is not None:
            return f"NUMBER({p_i})"
        return "NUMBER"
    if dt in ("VARCHAR2", "CHAR", "NVARCHAR2", "NCHAR"):
        ln = row.get("data_length")
        try:
            ln_i = int(ln) if ln is not None else None
        except (TypeError, ValueError):
            ln_i = None
        return f"{dt}({ln_i})" if ln_i is not None else dt
    if dt == "FLOAT":
        p = row.get("data_precision")
        try:
            p_i = int(p) if p is not None else None
        except (TypeError, ValueError):
            p_i = None
        return f"FLOAT({p_i})" if p_i is not None else "FLOAT"
    return dt


def _oracle_schema_from_data_dictionary(
    engine: Any, owner: Optional[str]
) -> Optional[List[Dict[str, Any]]]:
    """
    One dictionary query for all tables + views in the schema — avoids hundreds of
    SQLAlchemy reflection round-trips (which often exceed HTTP client timeouts).
    """
    try:
        if owner:
            q = text(
                """
                SELECT table_name, column_id, column_name, data_type,
                       data_length, data_precision, data_scale
                FROM all_tab_columns
                WHERE owner = :owner
                ORDER BY table_name, column_id
                """
            )
            tab_params: Dict[str, str] = {"owner": owner.upper()}
        else:
            q = text(
                """
                SELECT table_name, column_id, column_name, data_type,
                       data_length, data_precision, data_scale
                FROM user_tab_columns
                ORDER BY table_name, column_id
                """
            )
            tab_params = None

        tables_map: Dict[str, List[Dict[str, Any]]] = {}
        with engine.connect() as c:
            result = c.execute(q, tab_params) if tab_params is not None else c.execute(q)
            for row in result.mappings():
                r = dict(row)
                tname = r.get("table_name")
                cname = r.get("column_name")
                if not tname or not cname:
                    continue
                tables_map.setdefault(tname, []).append(
                    {"name": cname, "type": _oracle_format_data_dictionary_type(r)}
                )
        return [{"name": k, "columns": v} for k, v in tables_map.items()]
    except Exception:
        logger.exception("Oracle data dictionary schema listing failed; falling back to inspector.")
        return None


def _inspector_get_columns(insp: Any, object_name: str, schema: Optional[str]) -> List[Dict[str, Any]]:
    """
    Run SQLAlchemy column reflection. Oracle (especially views) often yields datatype
    metadata SQLAlchemy maps to NullType / "UNDEFINED", which spams SAWarning — we only
    need names for the designer, so those warnings are suppressed here.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=SAWarning)
        if schema:
            return list(insp.get_columns(object_name, schema=schema))
        return list(insp.get_columns(object_name))


def get_connection_schema(conn: DataConnection) -> Dict[str, Any]:
    """
    Return database tables + views + columns for report designer.
    """
    if conn.kind in {
        DataConnection.Kind.POSTGRES,
        DataConnection.Kind.MYSQL,
        DataConnection.Kind.MSSQL,
        DataConnection.Kind.ORACLE,
        DataConnection.Kind.SQLITE,
    }:
        engine = get_sqlalchemy_engine(conn)
        insp = inspect(engine)
        # Oracle: pass explicit schema so reflection matches the connected user’s objects.
        reflect_schema = None
        if conn.kind == DataConnection.Kind.ORACLE:
            cfg = conn.config or {}
            override = (cfg.get("schema") or "").strip()
            reflect_schema = override or getattr(insp, "default_schema_name", None)
            oracle_owner = (reflect_schema or "").strip().upper() or None
            fast_tables = _oracle_schema_from_data_dictionary(engine, oracle_owner)
            if fast_tables is not None:
                return {"tables": fast_tables}

        object_names = _reflectable_object_names(insp, reflect_schema)

        tables = []
        for object_name in object_names:
            cols = _inspector_get_columns(insp, object_name, reflect_schema)
            tables.append(
                {
                    "name": object_name,
                    "columns": [
                        {"name": c.get("name"), "type": str(c.get("type"))} for c in cols
                    ],
                }
            )
        return {"tables": tables}

    if conn.kind == DataConnection.Kind.S3:
        tables, note = _discover_iceberg_tables_s3(conn)
        payload: Dict[str, Any] = {"tables": tables}
        if note:
            payload["note"] = note
        return payload

    if conn.kind == DataConnection.Kind.NESSIE:
        tables, note = _discover_iceberg_tables_nessie(conn)
        payload = {"tables": tables}
        if note:
            payload["note"] = note
        return payload

    raise ValueError(f"Schema discovery not supported for kind={conn.kind}")


def _s3_resolve_credentials(secret: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """Support UI that sends access keys or generic user/password."""
    ak = secret.get("access_key_id") or secret.get("user")
    sk = secret.get("secret_access_key") or secret.get("password")
    return ak, sk


def _s3_resolve_bucket(cfg: Dict[str, Any]) -> str:
    b = cfg.get("bucket") or cfg.get("database")
    if not b:
        raise ValueError("S3: set bucket in connection config (bucket or database field).")
    return str(b)


def _normalize_s3_endpoint(raw: Optional[str]) -> Optional[str]:
    if not raw or not str(raw).strip():
        return None
    s = str(raw).strip()
    if s.startswith("http://") or s.startswith("https://"):
        return s
    return f"http://{s}"


def _s3_endpoint_for_boto(raw: Optional[str]) -> Optional[str]:
    """
    Boto3 MinIO/S3 endpoint must be the API origin only: http(s)://host[:port].
    Paths like /bucket-name (users sometimes paste bucket into the endpoint) break connectivity.
    """
    base = _normalize_s3_endpoint(raw)
    if not base:
        return None
    p = urlparse(base)
    if p.scheme and p.netloc:
        return f"{p.scheme}://{p.netloc}".rstrip("/")
    return base.rstrip("/")


def _nessie_extra_props(cfg: Dict[str, Any]) -> Dict[str, str]:
    """
    Advanced connection properties (e.g. fs.s3a.*) stored as dict or list of {name,value}.
    """
    raw = cfg.get("extra_properties")
    if isinstance(raw, dict):
        return {str(k): str(v) for k, v in raw.items() if k is not None}
    if isinstance(raw, list):
        out: Dict[str, str] = {}
        for row in raw:
            if not isinstance(row, dict):
                continue
            n = row.get("name")
            if n:
                out[str(n)] = str(row.get("value", ""))
        return out
    return {}


def _nessie_storage_endpoint(cfg: Dict[str, Any]) -> Optional[str]:
    ep = cfg.get("endpoint_url") or cfg.get("host") or cfg.get("storage_endpoint")
    extra = _nessie_extra_props(cfg)
    if not ep:
        ep = extra.get("fs.s3a.endpoint")
    return _s3_endpoint_for_boto(ep)


def _nessie_parse_warehouse_uri(cfg: Dict[str, Any]) -> Tuple[str, str]:
    """Return (bucket, key_prefix with trailing slash or empty)."""
    w = (cfg.get("warehouse_uri") or cfg.get("s3_root") or "").strip()
    bucket = (cfg.get("bucket") or cfg.get("database") or "").strip()
    prefix = (cfg.get("prefix") or "").strip().strip("/")
    if w.startswith("s3://"):
        rest = w[5:]
        if "/" in rest:
            bucket, rest_pref = rest.split("/", 1)
            prefix = rest_pref.strip("/")
        else:
            bucket = rest
    elif w and not bucket:
        # Bare name without scheme (legacy / manual JSON)
        if "/" in w:
            bucket, rest_pref = w.split("/", 1)
            prefix = rest_pref.strip("/")
        else:
            bucket = w
    if not bucket:
        raise ValueError(
            "No S3 warehouse bucket in saved config. Open Edit → Storage tab, set **S3 warehouse root** "
            "(e.g. iceberg-warehouse — same as the bucket name in MinIO), then Save."
        )
    pfx = f"{prefix}/" if prefix else ""
    return bucket, pfx


def _nessie_iceberg_base(cfg: Dict[str, Any]) -> str:
    explicit = (cfg.get("iceberg_catalog_uri") or "").strip().rstrip("/")
    if explicit:
        return explicit
    nu = (cfg.get("nessie_url") or "").strip().rstrip("/")
    if not nu:
        raise ValueError(
            "Nessie: set nessie_url (e.g. http://host:19120/api/v2) or iceberg_catalog_uri."
        )
    for suffix in ("/api/v2", "/api/v1"):
        if nu.endswith(suffix):
            nu = nu[: -len(suffix)].rstrip("/")
            break
    path = urlparse(nu).path.rstrip("/")
    if path.endswith("/iceberg") or "/iceberg/" in (path + "/"):
        return nu
    return f"{nu}/iceberg"


def _nessie_rest_session(conn: DataConnection):
    import requests

    secret = decrypt_json(conn.secret_encrypted)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    token = (secret.get("nessie_bearer_token") or secret.get("bearer_token") or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    s = requests.Session()
    s.headers.update(headers)
    return s


def _iceberg_ns_parent_query(parent_parts: List[str]) -> Dict[str, str]:
    if not parent_parts:
        return {}
    sep = "\x1f"
    return {"parent": quote(sep.join(parent_parts), safe="")}


def _iceberg_ns_path_segment(ns_parts: List[str]) -> str:
    sep = "\x1f"
    return quote(sep.join(ns_parts), safe="")


def _nessie_list_namespaces_bfs(session, base: str) -> List[List[str]]:
    out: List[List[str]] = []
    seen_ns: set = set()
    seen_parents: set = set()
    queue: List[List[str]] = [[]]
    while queue:
        parent = queue.pop(0)
        pt = tuple(parent)
        if pt in seen_parents:
            continue
        seen_parents.add(pt)
        url = f"{base}/v1/namespaces"
        params = _iceberg_ns_parent_query(parent) if parent else {}
        r = session.get(url, params=params, timeout=60)
        if r.status_code >= 400:
            raise ValueError(f"List namespaces failed ({r.status_code}): {r.text[:400]}")
        data = r.json()
        raw_list = data.get("namespaces")
        if raw_list is None:
            raw_list = data.get("namespace", [])
        for ns in raw_list or []:
            parts: List[str]
            if isinstance(ns, list):
                parts = [str(x) for x in ns]
            elif isinstance(ns, dict):
                inner = ns.get("namespace") or ns.get("parts")
                if isinstance(inner, list):
                    parts = [str(x) for x in inner]
                else:
                    continue
            else:
                continue
            tup = tuple(parts)
            if tup in seen_ns:
                continue
            seen_ns.add(tup)
            out.append(parts)
            queue.append(parts)
    return out


def _nessie_list_tables(session, base: str, ns_parts: List[str]) -> List[str]:
    seg = _iceberg_ns_path_segment(ns_parts)
    url = f"{base}/v1/namespaces/{seg}/tables"
    r = session.get(url, timeout=60)
    if r.status_code == 404:
        return []
    if r.status_code >= 400:
        return []
    data = r.json()
    identifiers = data.get("identifiers") or []
    names: List[str] = []
    for ident in identifiers:
        if isinstance(ident, dict):
            n = ident.get("name") or ident.get("table")
            if isinstance(n, str):
                names.append(n)
            elif isinstance(n, list) and n:
                names.append(str(n[-1]))
        elif isinstance(ident, list) and ident:
            names.append(str(ident[-1]))
    return names


def _parse_s3_uri(uri: str) -> Tuple[str, str]:
    if not uri.startswith("s3://"):
        raise ValueError("metadata-location must be an s3:// URI for warehouse fetch")
    rest = uri[5:]
    if "/" in rest:
        bucket, key = rest.split("/", 1)
        return bucket, unquote(key)
    return rest, ""


def _nessie_s3_client(conn: DataConnection):
    import boto3
    from botocore.config import Config as BotoConfig

    cfg = conn.config or {}
    secret = decrypt_json(conn.secret_encrypted)
    ak, sk = _s3_resolve_credentials(secret)
    path_style = False
    extra = _nessie_extra_props(cfg)
    if str(extra.get("fs.s3a.path.style.access", "")).lower() in ("true", "1", "yes"):
        path_style = True
    return boto3.client(
        "s3",
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
        region_name=cfg.get("region") or "us-east-1",
        endpoint_url=_nessie_storage_endpoint(cfg) or None,
        config=BotoConfig(s3={"addressing_style": "path" if path_style else "auto"}),
    )


def _nessie_load_table_columns(
    conn: DataConnection, session, base: str, ns_parts: List[str], table: str
) -> List[Dict[str, str]]:
    ns_seg = _iceberg_ns_path_segment(ns_parts)
    tbl_seg = quote(table, safe="")
    url = f"{base}/v1/namespaces/{ns_seg}/tables/{tbl_seg}"
    r = session.get(url, timeout=90)
    if r.status_code >= 400:
        return []
    data = r.json()
    meta = data.get("metadata")
    if isinstance(meta, dict) and meta:
        return _columns_from_iceberg_meta(meta)
    loc = data.get("metadata-location") or data.get("metadataLocation")
    if not loc or not isinstance(loc, str):
        return []
    try:
        body = _nessie_metadata_body_from_location(conn, loc)
    except Exception:
        body = None
    if not body:
        return []
    return _parse_iceberg_metadata_body(body)


def _nessie_metadata_body_from_location(conn: DataConnection, location: str) -> Optional[bytes]:
    bucket, key = _parse_s3_uri(location)
    client = _nessie_s3_client(conn)
    obj = client.get_object(Bucket=bucket, Key=key)
    return obj["Body"].read()


def _discover_iceberg_tables_nessie(conn: DataConnection) -> Tuple[List[Dict[str, Any]], str]:
    cfg = conn.config or {}
    base = _nessie_iceberg_base(cfg)
    session = _nessie_rest_session(conn)
    namespaces = _nessie_list_namespaces_bfs(session, base)
    if not namespaces:
        try:
            if _nessie_list_tables(session, base, []):
                namespaces = [[]]
        except Exception:
            pass
    tables_out: List[Dict[str, Any]] = []
    max_tables = int(getattr(settings, "NESSIE_ICEBERG_SCHEMA_MAX_TABLES", 200))
    note = (
        "Nessie / Iceberg: schema comes from the catalog REST API and table metadata on your object store. "
        "SQL preview and report execution are not wired for the catalog directly — use a SQL engine "
        "(Trino, Spark, Dremio, etc.) that points at this Nessie catalog."
    )
    for ns_parts in namespaces:
        if len(tables_out) >= max_tables:
            break
        tnames = _nessie_list_tables(session, base, ns_parts)
        for t in tnames:
            if len(tables_out) >= max_tables:
                break
            cols = _nessie_load_table_columns(conn, session, base, ns_parts, t)
            if not cols:
                cols = [{"name": "_unreadable", "type": "unknown"}]
            fq = ".".join(ns_parts + [t]) if ns_parts else t
            tables_out.append({"name": fq, "columns": cols})
    if not tables_out and not namespaces:
        note = (
            note
            + " No namespaces or tables were returned — check Nessie URL / branch and that tables exist in the catalog."
        )
    return tables_out, note


def _s3_client(conn: DataConnection):
    import boto3

    cfg = conn.config or {}
    secret = decrypt_json(conn.secret_encrypted)
    ak, sk = _s3_resolve_credentials(secret)
    return boto3.client(
        "s3",
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
        region_name=cfg.get("region") or "us-east-1",
        endpoint_url=_s3_endpoint_for_boto(cfg.get("endpoint_url") or cfg.get("host") or None),
    )


def _iceberg_type_to_str(t: Any) -> str:
    if t is None:
        return "unknown"
    if isinstance(t, str):
        return t
    if isinstance(t, dict):
        name = t.get("type") or t.get("logicalType")
        if name == "struct":
            return "struct"
        if name == "list":
            return f"list<{_iceberg_type_to_str(t.get('element'))}>"
        if name == "map":
            return f"map<{_iceberg_type_to_str(t.get('key'))},{_iceberg_type_to_str(t.get('value'))}>"
        if name == "fixed":
            return f"fixed[{t.get('length')}]"
        if name == "decimal":
            return f"decimal({t.get('precision', 0)},{t.get('scale', 0)})"
        return str(name or json.dumps(t, default=str))
    return str(t)


def _columns_from_iceberg_meta(meta: Dict[str, Any]) -> List[Dict[str, str]]:
    fields_src: Optional[List[dict]] = None
    schemas = meta.get("schemas")
    if isinstance(schemas, list) and schemas:
        sid = meta.get("current-schema-id", 0)
        chosen = None
        for s in schemas:
            if isinstance(s, dict) and s.get("schema-id") == sid:
                chosen = s
                break
        if chosen is None:
            chosen = schemas[0] if isinstance(schemas[0], dict) else None
        if chosen:
            fields_src = chosen.get("fields")
    if fields_src is None and isinstance(meta.get("schema"), dict):
        fields_src = meta["schema"].get("fields")
    if not fields_src:
        return []
    out: List[Dict[str, str]] = []
    for f in fields_src:
        if not isinstance(f, dict):
            continue
        nm = f.get("name") or str(f.get("id", ""))
        if not nm:
            continue
        out.append({"name": nm, "type": _iceberg_type_to_str(f.get("type"))})
    return out


def _parse_iceberg_metadata_body(body: bytes) -> List[Dict[str, str]]:
    try:
        meta = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return []
    if not isinstance(meta, dict):
        return []
    return _columns_from_iceberg_meta(meta)


def _metadata_json_rank(key: str) -> Tuple[int, str]:
    """Prefer Iceberg versioned names: 000xx-....metadata.json sorts by version."""
    base = key.rsplit("/", 1)[-1]
    m = re.match(r"^(\d+)-", base)
    if m:
        return (int(m.group(1)), base)
    return (-1, base)


def _discover_iceberg_tables_s3(conn: DataConnection) -> Tuple[List[Dict[str, Any]], str]:
    """
    List Iceberg tables by scanning for *.metadata.json under metadata/ folders,
    then load the newest metadata file per table root to read column schema.

    Table `name` uses dot-separated path (relative to optional prefix) for stable IDs.
    """
    cfg = conn.config or {}
    bucket = _s3_resolve_bucket(cfg)
    prefix = (cfg.get("prefix") or cfg.get("warehouse_prefix") or "").strip()
    if prefix and not prefix.endswith("/"):
        prefix += "/"

    client = _s3_client(conn)
    tables_by_root: Dict[str, List[Tuple[str, Any]]] = {}
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents") or []:
            key = obj.get("Key") or ""
            if "/metadata/" not in key or not key.endswith(".metadata.json"):
                continue
            root, _sep, _rest = key.partition("/metadata/")
            if not root:
                continue
            tables_by_root.setdefault(root, []).append(key)

    if not tables_by_root:
        note = (
            "No Iceberg metadata (*.metadata.json under .../metadata/) found under this prefix. "
            "Set config.prefix to your warehouse folder (e.g. 'warehouse/'). "
            "Report SQL execution is not available for S3 — use Trino, Spark, or JDBC to query Iceberg; "
            "this listing is for schema exploration in the designer only."
        )
        return [], note

    tables: List[Dict[str, Any]] = []
    max_tables = int(getattr(settings, "S3_ICEBERG_SCHEMA_MAX_TABLES", 100))
    for root in sorted(tables_by_root.keys())[:max_tables]:
        keys = tables_by_root[root]
        keys.sort(key=_metadata_json_rank, reverse=True)
        best_key = keys[0]
        try:
            obj = client.get_object(Bucket=bucket, Key=best_key)
            body = obj["Body"].read()
        except Exception:
            continue
        columns = _parse_iceberg_metadata_body(body)
        if not columns:
            columns = [{"name": "_metadata_unreadable", "type": "unknown"}]
        rel = root[len(prefix) :] if prefix and root.startswith(prefix) else root
        display_name = rel.replace("/", ".").strip(".") or root.replace("/", ".")
        tables.append({"name": display_name, "columns": columns, "iceberg_root": root})

    note = (
        "S3 / Iceberg: columns come from Iceberg metadata files. "
        "SQL preview and report execution are not wired for raw S3 — connect a query engine "
        "(e.g. Trino with Iceberg + this bucket) to run SELECTs."
    )
    return tables, note

