"""
Importa CSVs.gz no SQLite do Rails.

Uso: python3 db/import_csv.py

Lida com CSVs no formato MySQL (escapechar=\\, quoted fields com \\")
"""

import gzip, sqlite3
from pathlib import Path
import pandas as pd

DB  = Path("storage/development.sqlite3")
BKP = Path("db/bkp")
BATCH = 500

NOT_NULL_DEFAULTS = {
    "clicks": {"url": ""},
}

def load_csv(conn, table, path):
    try:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            df = pd.read_csv(f, escapechar="\\", encoding="utf-8",
                             low_memory=False)
        df = df.where(pd.notna(df), None)
        df = df.map(lambda v: None if v == "NULL" else v)
        for col, default in NOT_NULL_DEFAULTS.get(table, {}).items():
            if col in df.columns:
                df[col] = df[col].fillna(default)

        cols = ",".join(df.columns)
        ph = ",".join("?" for _ in df.columns)
        sql = f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({ph})"

        rows = df.values.tolist()
        for i in range(0, len(rows), BATCH):
            batch = rows[i:i+BATCH]
            conn.executemany(sql, batch)
            conn.commit()

        n = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table:<12} {n:>8} registros")
    except Exception as e:
        import traceback
        print(f"  {table:<12} ERRO: {e}")
        traceback.print_exc()

def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    order = ["estados","areas","segmentos","cidades","entidades","projetos",
             "incentivos","recibos","links","clicks"]
    for name in order:
        path = BKP / f"{name}.csv.gz"
        if not path.exists():
            print(f"  {name:<12} (ausente)")
            continue
        load_csv(conn, name, path)
    conn.execute("PRAGMA synchronous=FULL")
    conn.close()

if __name__ == "__main__":
    main()
