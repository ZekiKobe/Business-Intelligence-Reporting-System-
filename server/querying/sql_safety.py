import re

import sqlparse


_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b",
    re.IGNORECASE,
)


def ensure_readonly_sql(sql: str) -> None:
    s = (sql or "").strip()
    if not s:
        raise ValueError("SQL is required")

    statements = [statement for statement in sqlparse.parse(s) if str(statement).strip()]
    if len(statements) != 1:
        raise ValueError("Only a single SQL statement is allowed")
    statement = statements[0]
    if statement.get_type().upper() != "SELECT":
        raise ValueError("Only SELECT statements are allowed")
    meaningful_sql = " ".join(
        token.value for token in statement.flatten()
        if not token.is_whitespace
        and token.ttype not in sqlparse.tokens.Comment
        and token.ttype not in sqlparse.tokens.Literal.String
    )
    if _FORBIDDEN.search(meaningful_sql):
        raise ValueError("Only read-only SQL is allowed")

