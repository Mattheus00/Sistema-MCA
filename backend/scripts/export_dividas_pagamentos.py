#!/usr/bin/env python3
"""Exporta dividas e pagamentos do SQLite local para SQL de restauração."""

import sqlite3
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "data" / "sgi.db"
OUT = Path(__file__).resolve().parents[1] / "data" / "restore_dividas_pagamentos.sql"

TABLES = ["divida", "divida_servico", "pagamento"]


def sql_literal(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"


def main() -> int:
    if not SRC.exists():
        print(f"Banco não encontrado: {SRC}")
        return 1

    conn = sqlite3.connect(SRC)
    conn.row_factory = sqlite3.Row
    lines = ["BEGIN TRANSACTION;", "PRAGMA foreign_keys=OFF;"]

    for table in TABLES:
        try:
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        except sqlite3.Error:
            continue
        if not cols:
            continue
        rows = conn.execute(f"SELECT * FROM {table}").fetchall()
        lines.append(f"-- {table}: {len(rows)} registros")
        col_list = ", ".join(cols)
        for row in rows:
            values = ", ".join(sql_literal(row[c]) for c in cols)
            lines.append(f"INSERT OR REPLACE INTO {table} ({col_list}) VALUES ({values});")

    lines.extend(["PRAGMA foreign_keys=ON;", "COMMIT;"])
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Exportado para {OUT}")
    print(f"divida={conn.execute('SELECT COUNT(*) FROM divida').fetchone()[0]}")
    print(f"pagamento={conn.execute('SELECT COUNT(*) FROM pagamento').fetchone()[0]}")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
