import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
db = ROOT / "data" / "sgi.db"
c = sqlite3.connect(db)
ddl = c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='cliente'").fetchone()
print("DDL:", ddl[0] if ddl else None)
print("count:", c.execute("SELECT COUNT(*) FROM cliente").fetchone()[0])
print("indexes:", list(c.execute("PRAGMA index_list(cliente)")))
dup = c.execute(
    "SELECT codigo, COUNT(*) FROM cliente GROUP BY codigo HAVING COUNT(*) > 1"
).fetchall()
print("dup codigo in db:", dup)
print("karla/conceicao:")
for row in c.execute(
    "SELECT codigo, nome, cpf_cnpj FROM cliente WHERE nome LIKE '%KARLA%' OR nome LIKE '%CONCEI%' ORDER BY codigo"
):
    print(row)
hash_path = ROOT / "data" / ".clientes-relatorio-hash"
print("hash exists:", hash_path.exists())
