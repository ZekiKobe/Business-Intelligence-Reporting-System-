import re


_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b",
    re.IGNORECASE,
)


def ensure_readonly_sql(sql: str) -> None:
    s = (sql or "").strip()
    if not s:
        raise ValueError("SQL is required")

    # Disallow multiple statements (very rough).
    if ";" in s.strip().rstrip(";"):
        raise ValueError("Only a single SQL statement is allowed")

    if _FORBIDDEN.search(s):
        raise ValueError("Only read-only SQL is allowed")

