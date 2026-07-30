import sqlite3
from pathlib import Path

db = Path(__file__).resolve().parents[1] / "data" / "sgi.db"
c = sqlite3.connect(db)
for (name,) in c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
    n = c.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
    print(f"{name}: {n}")
