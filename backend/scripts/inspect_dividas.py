import sqlite3
from pathlib import Path

db = Path(__file__).resolve().parents[1] / "data" / "sgi.db"
c = sqlite3.connect(db)
print("DB:", db)
print("Status dividas:", list(c.execute("SELECT status_divida, COUNT(*) FROM divida GROUP BY status_divida")))
print("Inadimplentes:", c.execute(
    "SELECT COUNT(*) FROM divida WHERE status_divida IN ('EM_ABERTO','VENCIDA','PARCIAL')"
).fetchone()[0])
print("Pagamentos:", c.execute("SELECT COUNT(*) FROM pagamento").fetchone()[0])
print("Sample pagamentos:")
for r in c.execute(
    "SELECT d.protocolo, d.status_divida, p.valor_pago, p.data_pagamento "
    "FROM pagamento p JOIN divida d ON d.divida_id=p.divida_id LIMIT 8"
):
    print(" ", r)
c.close()
