#!/usr/bin/env python3
"""Migra dados do SQLite local para PostgreSQL (Render).

Uso:
  pip install psycopg2-binary
  set DATABASE_URL=postgres://user:pass@host:5432/sgi
  python scripts/migrate_sqlite_to_postgres.py

O backend deve ter subido pelo menos uma vez no Postgres (Hibernate cria as tabelas).
"""

from __future__ import annotations

import os
import sqlite3
import sys
import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

try:
    import psycopg2
except ImportError:
    print("Instale: pip install psycopg2-binary")
    sys.exit(1)

TABLES_ORDER = [
    "usuario",
    "cliente",
    "servico",
    "juros_config",
    "email_config",
    "configuracao_cobranca",
    "honorario_cliente",
    "divida",
    "divida_item_servico",
    "pagamento",
    "notificacao_email",
    "agendamento_notificacao",
    "lote_envio_boleto",
    "envio_boleto",
    "auditoria_operacao",
]

SQLITE_DEFAULT = Path(__file__).resolve().parents[1] / "data" / "sgi.db"
UUID_COLUMNS_SUFFIX = "_id"


def parse_database_url(url: str) -> dict:
    parsed = urlparse(url.replace("postgres://", "postgresql://"))
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "dbname": (parsed.path or "/sgi").lstrip("/"),
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
        "sslmode": "require",
    }


def convert_value(val, col_name: str):
    if val is None:
        return None
    if isinstance(val, bytes) and (col_name.endswith(UUID_COLUMNS_SUFFIX) or col_name.endswith("_por_id")):
        return str(uuid.UUID(bytes=val))
    if isinstance(val, bytes):
        return psycopg2.Binary(val)
    return val


def sqlite_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def postgres_columns(pg, table: str) -> list[str]:
    with pg.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        return [r[0] for r in cur.fetchall()]


def migrate_table(sqlite: sqlite3.Connection, pg, table: str) -> int:
    if not sqlite.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone():
        return 0

    src_cols = sqlite_columns(sqlite, table)
    dst_cols = postgres_columns(pg, table)
    if not dst_cols:
        print(f"  SKIP {table} (tabela ausente no Postgres — rode o backend uma vez antes)")
        return 0

    cols = [c for c in src_cols if c in dst_cols]
    if not cols:
        print(f"  SKIP {table} (sem colunas em comum)")
        return 0

    rows = sqlite.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()
    if not rows:
        return 0

    sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))}) ON CONFLICT DO NOTHING"
    inserted = 0
    with pg.cursor() as cur:
        for row in rows:
            values = [convert_value(v, cols[i]) for i, v in enumerate(row)]
            cur.execute(sql, values)
            inserted += max(cur.rowcount, 0)
    pg.commit()
    return inserted


def main() -> int:
    sqlite_path = Path(os.environ.get("SGI_SQLITE_PATH", str(SQLITE_DEFAULT)))
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Defina DATABASE_URL (connection string do PostgreSQL no Render).")
        return 1
    if not sqlite_path.exists():
        print(f"SQLite não encontrado: {sqlite_path}")
        return 1

    params = parse_database_url(database_url)
    print(f"Origem SQLite: {sqlite_path}")
    print(f"Destino Postgres: {params['host']}/{params['dbname']}")

    sqlite = sqlite3.connect(sqlite_path)
    pg = psycopg2.connect(
        host=params["host"],
        port=params["port"],
        dbname=params["dbname"],
        user=params["user"],
        password=params["password"],
        sslmode=params["sslmode"],
    )

    total = 0
    for table in TABLES_ORDER:
        try:
            count = migrate_table(sqlite, pg, table)
            print(f"  {table}: {count} linhas")
            total += count
        except Exception as exc:
            pg.rollback()
            print(f"  ERRO em {table}: {exc}")

    sqlite.close()
    pg.close()
    print(f"Migração concluída ({total} linhas inseridas).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
