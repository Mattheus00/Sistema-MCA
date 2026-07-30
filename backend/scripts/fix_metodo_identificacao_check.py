#!/usr/bin/env python3
"""Atualiza CHECK constraint de metodo_identificacao para incluir CODIGO_CLIENTE."""

import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "data" / "sgi.db"

OLD_FRAGMENT = (
    "metodo_identificacao in ('CPF_CNPJ','NOME_EXATO','NOME_APROXIMADO','MANUAL','NAO_IDENTIFICADO')"
)
NEW_FRAGMENT = (
    "metodo_identificacao in ('CODIGO_CLIENTE','CPF_CNPJ','NOME_EXATO','NOME_APROXIMADO','MANUAL','NAO_IDENTIFICADO')"
)


def main() -> int:
    if not DB.exists():
        print(f"Banco não encontrado: {DB}")
        return 1

    conn = sqlite3.connect(DB)
    try:
        row = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='envio_boleto'"
        ).fetchone()
        if not row:
            print("Tabela envio_boleto não existe — nada a fazer.")
            return 0

        ddl = row[0] or ""
        if "CODIGO_CLIENTE" in ddl:
            print("Constraint já inclui CODIGO_CLIENTE.")
            return 0

        if OLD_FRAGMENT not in ddl:
            print("CHECK antigo não encontrado. DDL atual:")
            print(ddl)
            return 1

        new_ddl = ddl.replace(OLD_FRAGMENT, NEW_FRAGMENT)
        cols = [c[1] for c in conn.execute("PRAGMA table_info(envio_boleto)").fetchall()]
        col_list = ", ".join(cols)

        conn.execute("PRAGMA foreign_keys=OFF")
        conn.executescript(
            f"""
            BEGIN;
            CREATE TABLE envio_boleto_new {new_ddl[len('CREATE TABLE envio_boleto'):]};
            INSERT INTO envio_boleto_new ({col_list}) SELECT {col_list} FROM envio_boleto;
            DROP TABLE envio_boleto;
            ALTER TABLE envio_boleto_new RENAME TO envio_boleto;
            COMMIT;
            """
        )
        conn.execute("PRAGMA foreign_keys=ON")
        print("CHECK constraint atualizado com CODIGO_CLIENTE.")
        return 0
    except Exception as e:
        try:
            conn.execute("ROLLBACK")
        except Exception:
            pass
        print(f"Erro: {e}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
