"""
Cria as tabelas em storage/development.sqlite3 a partir de db/schema.rb,
sem precisar do Ruby/Rails (o ambiente rvm local está com o dylib do
openssl@1.1 quebrado após upgrade do homebrew — `bin/rails db:schema:load`
não roda). Espelha o que `db:schema:load` faria: cria as tabelas + índices
do schema.rb e marca todas as migrations existentes como aplicadas em
schema_migrations, pra não colidir se o Rails voltar a funcionar depois.

Idempotente: seguro rodar de novo (CREATE TABLE IF NOT EXISTS).

Usage:
    python3 db/load_schema_sqlite.py
"""

import re, sqlite3
from pathlib import Path

SCHEMA   = Path("db/schema.rb")
MIGRATE  = Path("db/migrate")
SQLITE   = Path("storage/development.sqlite3")

TYPE_MAP = {
    "string": "varchar", "text": "text", "integer": "integer",
    "bigint": "integer", "decimal": "decimal", "float": "float",
    "boolean": "boolean", "date": "date", "datetime": "datetime",
}


def parse_tables(schema_src):
    tables = []
    for name, body in re.findall(
        r'create_table "(\w+)".*?do \|t\|\n(.*?)\n  end', schema_src, re.DOTALL
    ):
        cols, indexes = [], []
        for line in body.splitlines():
            line = line.strip()
            m = re.match(r't\.(\w+) "(\w+)"(.*)', line)
            if m:
                rtype, col, rest = m.groups()
                sqltype = TYPE_MAP.get(rtype, "varchar")
                null_ok = "null: false" not in rest
                default = ""
                dm = re.search(r'default: ("(?:[^"\\]|\\.)*"|[\d.]+|true|false)', rest)
                if dm:
                    val = dm.group(1)
                    if val in ("true", "false"):
                        val = "1" if val == "true" else "0"
                    default = f" DEFAULT {val}"
                cols.append(f'  "{col}" {sqltype}{default}{"" if null_ok else " NOT NULL"}')
                continue
            m = re.match(r't\.index \[(.+?)\], name: "(\w+)"(.*)', line)
            if m:
                idx_cols, idx_name, rest = m.groups()
                cols_list = ",".join(f'"{c.strip().strip(chr(34))}"' for c in idx_cols.split(","))
                unique = "UNIQUE " if "unique: true" in rest else ""
                indexes.append(
                    f'CREATE {unique}INDEX IF NOT EXISTS "{idx_name}" ON "{name}" ({cols_list})'
                )
        tables.append((name, cols, indexes))
    return tables


def main():
    schema_src = SCHEMA.read_text()
    tables = parse_tables(schema_src)
    print(f"  {len(tables)} tabelas encontradas em {SCHEMA}")

    SQLITE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE))
    conn.execute("PRAGMA journal_mode=WAL")

    for name, cols, indexes in tables:
        cols_sql = ",\n".join(['  "id" integer PRIMARY KEY AUTOINCREMENT'] + cols)
        conn.execute(f'CREATE TABLE IF NOT EXISTS "{name}" (\n{cols_sql}\n)')
        for idx_sql in indexes:
            conn.execute(idx_sql)
        print(f"    ok: {name} ({len(cols)} colunas, {len(indexes)} índices)")

    # marca migrations como aplicadas (mesmo comportamento do db:schema:load)
    conn.execute(
        'CREATE TABLE IF NOT EXISTS "schema_migrations" ("version" varchar NOT NULL PRIMARY KEY)'
    )
    conn.execute(
        'CREATE TABLE IF NOT EXISTS "ar_internal_metadata" ('
        '"key" varchar NOT NULL PRIMARY KEY, "value" varchar, '
        '"created_at" datetime NOT NULL, "updated_at" datetime NOT NULL)'
    )
    versions = sorted(p.name.split("_")[0] for p in MIGRATE.glob("*.rb"))
    conn.executemany(
        'INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)',
        [(v,) for v in versions]
    )
    conn.commit()
    conn.close()
    print(f"\n  {len(versions)} migrations marcadas como aplicadas.")
    print("Schema criado com sucesso.")


if __name__ == "__main__":
    main()
