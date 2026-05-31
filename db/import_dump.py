"""
Import all tables from the MySQL dump into SQLite using INSERT OR IGNORE.
Only adds records missing from SQLite — never overwrites existing ones.

Usage:
    python3 db/import_dump.py
"""

import tarfile, re, sqlite3
from pathlib import Path

DUMP   = Path("db/bkp/bkp/dump.mostre.sql.tgz")
SQLITE = Path("storage/development.sqlite3")

# Column renames: {table: {mysql_col: sqlite_col}}
RENAME_COLS = {
    "doadores": {"cpf": "cpf_cnpj"},
}

# Default values for NOT NULL columns absent from the dump
DEFAULT_TS = "2015-01-01 00:00:00"
EXTRA_DEFAULTS = {
    "candidatos": {"created_at": DEFAULT_TS, "updated_at": DEFAULT_TS},
    "comites":    {"created_at": DEFAULT_TS, "updated_at": DEFAULT_TS},
    "doacoes":    {"created_at": DEFAULT_TS, "updated_at": DEFAULT_TS},
    "doadores":   {"created_at": DEFAULT_TS, "updated_at": DEFAULT_TS},
}

# Tables to skip entirely (no INSERT data or already handled separately)
SKIP_TABLES = {"schema_migrations"}


def parse_values_line(line):
    """Parse a MySQL multi-row INSERT VALUES line into list of tuples."""
    m = re.match(r"INSERT INTO `\w+` VALUES (.+?);?\s*$", line.strip())
    if not m:
        return []
    s = m.group(1)
    rows = []
    i = 0
    while i < len(s):
        if s[i] != '(':
            i += 1
            continue
        depth, j, in_str, esc = 0, i, False, False
        while j < len(s):
            c = s[j]
            if esc:
                esc = False
            elif c == '\\' and in_str:
                esc = True
            elif c == "'" and not in_str:
                in_str = True
            elif c == "'" and in_str:
                in_str = False
            elif c == '(' and not in_str:
                depth += 1
            elif c == ')' and not in_str:
                depth -= 1
                if depth == 0:
                    rows.append(parse_row(s[i+1:j]))
                    i = j + 1
                    break
            j += 1
        else:
            break
    return rows


def parse_row(row_str):
    """Parse a single row's comma-separated MySQL values into a Python list."""
    values, i, s = [], 0, row_str.strip()
    while i < len(s):
        c = s[i]
        if c == "'":
            j, val = i + 1, []
            while j < len(s):
                c2 = s[j]
                if c2 == '\\' and j + 1 < len(s):
                    nc = s[j+1]
                    val.append({'n':'\n','t':'\t','r':'\r','\\':'\\',
                                "'":"'",'"':'"'}.get(nc, nc))
                    j += 2
                    continue
                elif c2 == "'":
                    j += 1
                    break
                val.append(c2)
                j += 1
            values.append(''.join(val))
            i = j
        elif s[i:i+4] == 'NULL':
            values.append(None)
            i += 4
        elif c == ',':
            i += 1
        elif c == ' ':
            i += 1
        else:
            j = i
            while j < len(s) and s[j] not in (',', ')'):
                j += 1
            token = s[i:j].strip()
            try:
                values.append(float(token) if '.' in token else int(token))
            except ValueError:
                values.append(token)
            i = j
    return values


def extract_schema(sql_text):
    """Return {table: [col, ...]} from MySQL CREATE TABLE statements."""
    schema = {}
    for name, body in re.findall(
        r'CREATE TABLE `(\w+)`\s*\((.+?)\)\s*ENGINE', sql_text, re.DOTALL
    ):
        cols = re.findall(r'^\s+`(\w+)`', body, re.MULTILINE)
        schema[name] = cols
    return schema


def get_sqlite_cols(conn, table):
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return [r[1] for r in rows]


def import_table(conn, table, mysql_cols, lines, sqlite_cols_set):
    rename   = RENAME_COLS.get(table, {})
    defaults = EXTRA_DEFAULTS.get(table, {})

    # Columns sourced from the dump — intersection with SQLite schema handles unknown cols
    mapping = []
    for i, col in enumerate(mysql_cols):
        dest = rename.get(col, col)
        if dest in sqlite_cols_set:
            mapping.append((i, dest))

    # Extra columns with hardcoded defaults (NOT NULL cols absent from dump)
    extra = [(col, val) for col, val in defaults.items() if col not in {d for _, d in mapping}]

    if not mapping and not extra:
        return 0

    dest_cols = [dest for _, dest in mapping] + [col for col, _ in extra]
    src_indices = [i for i, _ in mapping]
    placeholders = ",".join("?" * len(dest_cols))
    cols_sql = ",".join(dest_cols)
    sql = f"INSERT OR IGNORE INTO {table} ({cols_sql}) VALUES ({placeholders})"

    min_len = max(src_indices) + 1 if src_indices else 0
    extra_vals = [val for _, val in extra]

    total = 0
    for line in lines:
        if not line.startswith(f"INSERT INTO `{table}`"):
            continue
        rows = parse_values_line(line)
        batch = [
            [row[i] for i in src_indices] + extra_vals
            for row in rows if len(row) >= min_len
        ]
        if batch:
            conn.executemany(sql, batch)
            total += len(batch)

    return total


def main():
    print(f"Abrindo dump: {DUMP}")
    with tarfile.open(DUMP, "r:gz") as tar:
        f = tar.extractfile(tar.getmembers()[0])
        sql_text = f.read().decode("utf-8", errors="replace")

    lines = sql_text.splitlines()
    print(f"  {len(lines)} linhas no dump\n")

    mysql_schema = extract_schema(sql_text)

    conn = sqlite3.connect(str(SQLITE))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=OFF")

    tables_in_dump = {
        re.match(r"INSERT INTO `(\w+)`", l).group(1)
        for l in lines if l.startswith("INSERT INTO `")
    }

    for table in sorted(tables_in_dump):
        if table in SKIP_TABLES:
            continue

        sqlite_cols = get_sqlite_cols(conn, table)
        if not sqlite_cols:
            print(f"  {table:<28} — tabela não existe no SQLite, pulando")
            continue

        mysql_cols = mysql_schema.get(table, [])
        if not mysql_cols:
            print(f"  {table:<28} — sem schema no dump, pulando")
            continue

        before = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        n = import_table(conn, table, mysql_cols, lines, set(sqlite_cols))
        conn.commit()
        after = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        added = after - before
        print(f"  {table:<28} {before:>8} → {after:>8}   (+{added} de {n} no dump)")

    conn.execute("PRAGMA foreign_keys=ON")
    conn.close()
    print("\nFeito.")


if __name__ == "__main__":
    main()
