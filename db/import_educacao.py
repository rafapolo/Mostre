"""
Import educacao data (mantenedoras, instituicaos, cursos) from MySQL dump into SQLite.

Usage:
    python3 db/import_educacao.py
"""

import tarfile, re, sqlite3
from pathlib import Path

DUMP    = Path("db/bkp/bkp/dump.mostre.sql.tgz")
SQLITE  = Path("storage/development.sqlite3")

# MySQL column order (from CREATE TABLE in dump)
MYSQL_COLS = {
    "mantenedoras": ["id", "cod_mec", "cnpj", "natureza", "representante", "created_at", "updated_at"],
    "instituicaos": ["id", "liberada_at", "cod_mec", "mantenedora_id", "endereco_id",
                     "site", "sigla", "nome", "telefone", "org", "categoria",
                     "created_at", "updated_at", "emails", "urlized"],
    "cursos":       ["id", "nome", "created_at", "updated_at", "urlized"],
}

# SQLite target columns (subset of above that exist in current schema; add nome=NULL for mantenedoras)
SQLITE_COLS = {
    "mantenedoras": ["id", "cod_mec", "cnpj", "natureza", "representante", "created_at", "updated_at", "nome"],
    "instituicaos": ["id", "liberada_at", "cod_mec", "mantenedora_id", "endereco_id",
                     "site", "sigla", "nome", "telefone", "org", "categoria",
                     "created_at", "updated_at", "emails", "urlized"],
    "cursos":       ["id", "nome", "created_at", "updated_at", "urlized"],
}


def parse_values_line(line):
    """Parse MySQL multi-row INSERT VALUES line into list of tuples."""
    # Strip INSERT INTO `table` VALUES prefix
    m = re.match(r"INSERT INTO `\w+` VALUES (.+);?$", line.strip())
    if not m:
        return []
    values_str = m.group(1).rstrip(";")

    rows = []
    i = 0
    s = values_str
    while i < len(s):
        if s[i] == '(':
            # find matching closing paren, respecting quotes
            depth = 0
            start = i
            j = i
            in_str = False
            escape = False
            while j < len(s):
                c = s[j]
                if escape:
                    escape = False
                elif c == '\\' and in_str:
                    escape = True
                elif c == "'" and not in_str:
                    in_str = True
                elif c == "'" and in_str:
                    in_str = False
                elif c == '(' and not in_str:
                    depth += 1
                elif c == ')' and not in_str:
                    depth -= 1
                    if depth == 0:
                        rows.append(parse_row(s[start+1:j]))
                        i = j + 1
                        break
                j += 1
            else:
                break
        else:
            i += 1
    return rows


def parse_row(row_str):
    """Parse a single row's values into a Python list."""
    values = []
    i = 0
    s = row_str.strip()
    while i < len(s):
        if s[i] == "'":
            # string value
            j = i + 1
            val = []
            while j < len(s):
                c = s[j]
                if c == '\\' and j + 1 < len(s):
                    nc = s[j+1]
                    if nc == 'n':    val.append('\n')
                    elif nc == 't':  val.append('\t')
                    elif nc == 'r':  val.append('\r')
                    elif nc == '\\': val.append('\\')
                    elif nc == "'":  val.append("'")
                    elif nc == '"':  val.append('"')
                    else:            val.append(nc)
                    j += 2
                    continue
                elif c == "'":
                    j += 1
                    break
                else:
                    val.append(c)
                j += 1
            values.append(''.join(val))
            i = j
        elif s[i:i+4] == 'NULL':
            values.append(None)
            i += 4
        elif s[i] == ',':
            i += 1
        elif s[i] == ' ':
            i += 1
        else:
            # numeric
            j = i
            while j < len(s) and s[j] not in (',', ')'):
                j += 1
            token = s[i:j].strip()
            if '.' in token:
                values.append(float(token))
            else:
                try:
                    values.append(int(token))
                except ValueError:
                    values.append(token)
            i = j
    return values


def import_table(conn, table, sql_lines):
    mysql_cols = MYSQL_COLS[table]
    sqlite_cols = SQLITE_COLS[table]

    total = 0
    for line in sql_lines:
        if not line.startswith(f"INSERT INTO `{table}`"):
            continue
        rows = parse_values_line(line)
        for row in rows:
            # map MySQL columns to dict
            d = dict(zip(mysql_cols, row))
            # build values for SQLite columns
            vals = []
            for col in sqlite_cols:
                if col == "nome" and table == "mantenedoras" and col not in d:
                    vals.append(None)
                else:
                    vals.append(d.get(col))
            placeholders = ",".join("?" * len(sqlite_cols))
            cols_sql = ",".join(sqlite_cols)
            conn.execute(
                f"INSERT OR IGNORE INTO {table} ({cols_sql}) VALUES ({placeholders})",
                vals
            )
        total += len(rows)
    return total


def main():
    print(f"Abrindo dump: {DUMP}")
    with tarfile.open(DUMP, "r:gz") as tar:
        member = tar.getmembers()[0]
        f = tar.extractfile(member)
        sql_text = f.read().decode("utf-8", errors="replace")

    lines = sql_text.splitlines()
    print(f"  {len(lines)} linhas no dump")

    conn = sqlite3.connect(str(SQLITE))
    conn.execute("PRAGMA journal_mode=WAL")

    for table in ["mantenedoras", "cursos", "instituicaos"]:
        before = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        n = import_table(conn, table, lines)
        conn.commit()
        after = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {before} → {after} ({n} linhas processadas no dump)")

    conn.close()
    print("Feito.")


if __name__ == "__main__":
    main()
