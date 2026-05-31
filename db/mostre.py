"""
Mostre!me — scraper SALIC API → SQLite

Uso:
    python3 db/mostre.py sync                    # projetos + incentivadores
    python3 db/mostre.py sync projetos
    python3 db/mostre.py sync incentivos         # incentivadores
    python3 db/mostre.py sync por_projeto        # captações + entidades por projeto (lento, resumível)
    python3 db/mostre.py stats
    python3 db/mostre.py query "SELECT ..."
"""

import sys, re, asyncio, time, sqlite3, requests
from pathlib import Path

SQLITE_DB = Path("storage/development.sqlite3")
API_HOST  = "https://api.salic.cultura.gov.br"
API_BASE  = f"{API_HOST}/api/v1"
CHROME    = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# ── banco ──────────────────────────────────────────────────────────────────

def connect():
    conn = sqlite3.connect(str(SQLITE_DB), timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def stats():
    conn = connect()
    print("=== SQLite ===")
    for t in ["projetos", "entidades", "incentivos", "recibos", "links", "clicks"]:
        try:
            n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  {t:<20} {n:>8}")
        except Exception:
            print(f"  {t:<20}  (ausente)")

    print("\n=== TOP PATROCINADORES ===")
    try:
        rows = conn.execute("""
            SELECT substr(e.nome, 1, 50) as patrocinador,
                   COUNT(i.id) as projetos,
                   printf('R$ %.0f M', SUM(i.valor)/1e6) as total
            FROM incentivos i JOIN entidades e ON e.id = i.entidade_id
            GROUP BY e.nome ORDER BY SUM(i.valor) DESC LIMIT 8
        """).fetchall()
        for r in rows:
            print(f"  {r[0]:<52} {r[1]:>6} proj  {r[2]}")
    except Exception as e:
        print(f"  {e}")

    print("\n=== PROJETOS POR UF (com captação) ===")
    try:
        rows = conn.execute("""
            SELECT uf, COUNT(*) as n,
                   printf('R$ %.0f M', SUM(apoiado)/1e6) as apoiado
            FROM projetos WHERE apoiado > 0
            GROUP BY uf ORDER BY SUM(apoiado) DESC LIMIT 10
        """).fetchall()
        for r in rows:
            print(f"  {r[0]:<4} {r[1]:>6} proj  {r[2]}")
    except Exception as e:
        print(f"  {e}")

    conn.close()


# ── cloudflare: pega cookie com Chrome real ─────────────────────────────────

async def get_cf_session():
    """Abre Chrome uma vez, resolve CF, devolve session requests com cookies."""
    import nodriver as uc

    browser = await uc.start(
        headless=False,
        browser_executable_path=CHROME,
        browser_args=["--no-sandbox", "--disable-setuid-sandbox"],
    )
    await asyncio.sleep(2)
    page = await browser.get(f"{API_HOST}/api/v1/projetos?limit=1&format=json")
    print("  aguardando Cloudflare...", end=" ", flush=True)
    await asyncio.sleep(12)

    raw = await page.evaluate("document.body.innerText")
    if not raw or "Performing security" in raw:
        browser.stop()
        raise RuntimeError("CF challenge não passou. Tente de novo.")

    cookies = await browser.cookies.get_all()
    ua = await page.evaluate("navigator.userAgent")
    browser.stop()

    session = requests.Session()
    session.headers.update({"User-Agent": ua, "Accept": "application/json"})
    for c in cookies:
        session.cookies.set(c.name, c.value, domain=c.domain)

    print(f"ok ({len(cookies)} cookies)")
    return session


def api_get(session, path, params, _retries=4):
    for attempt in range(_retries):
        try:
            r = session.get(
                f"{API_BASE}{path}",
                params={**params, "format": "json"},
                timeout=60,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == _retries - 1:
                raise
            wait = 2 ** attempt
            print(f"\n  retry {attempt+1}/{_retries-1} ({e.__class__.__name__}) — aguardando {wait}s...",
                  end=" ", flush=True)
            time.sleep(wait)


# ── lookup maps ──────────────────────────────────────────────────────────────

def _build_maps(conn):
    area_map, seg_map, estado_map = {}, {}, {}
    for r in conn.execute("SELECT id, nome FROM areas").fetchall():
        area_map[r[1].lower().strip()] = r[0]
    for r in conn.execute("SELECT id, nome FROM segmentos").fetchall():
        seg_map[r[1].lower().strip()] = r[0]
    for r in conn.execute("SELECT id, sigla FROM estados").fetchall():
        estado_map[r[1].upper().strip()] = r[0]
    return area_map, seg_map, estado_map


def _extract_id(obj, name_map):
    if isinstance(obj, dict):
        id_ = obj.get("id")
        if id_ is not None:
            return int(id_)
        name = obj.get("nome", "")
    else:
        name = str(obj) if obj else ""
    return name_map.get(name.lower().strip()) if name else None


def _urlize(s):
    s = s.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    return re.sub(r'[-\s]+', '-', s).strip('-')


# ── sync projetos ─────────────────────────────────────────────────────────────

def sync_projetos(session, conn):
    area_map, seg_map, estado_map = _build_maps(conn)

    last = conn.execute(
        "SELECT MAX(CAST(numero AS INTEGER)) FROM projetos "
        "WHERE numero GLOB '[0-9]*'"
    ).fetchone()[0] or 0

    first = api_get(session, "/projetos", {"limit": 1})
    total = first.get("total", 0)
    print(f"  último PRONAC no banco: {last}  |  total na API: {total}")

    offset, inserted, t0 = 0, 0, time.time()
    batch_size = 100

    while True:
        data = api_get(session, "/projetos", {"limit": batch_size, "offset": offset})
        items = (
            data.get("_embedded", {}).get("projetos", []) or
            data.get("projetos", [])
        )
        if not items:
            break

        # build cgccpf → entidade_id cache from this batch's cgccpfs
        batch_cgccpfs = [
            str(p.get("cgccpf") or p.get("cgc_cpf") or "")
            for p in items
            if p.get("cgccpf") or p.get("cgc_cpf")
        ]
        entidade_cache = {}
        if batch_cgccpfs:
            placeholders = ",".join("?" * len(batch_cgccpfs))
            for r in conn.execute(
                f"SELECT cnpjcpf, id FROM entidades WHERE cnpjcpf IN ({placeholders})",
                batch_cgccpfs
            ).fetchall():
                entidade_cache[r[0]] = r[1]

        rows, stop = [], False
        for p in items:
            pronac = int(p.get("PRONAC") or p.get("pronac") or 0)
            if pronac <= last:
                stop = True
                continue

            nome    = (p.get("nome") or "")[:255]
            uf_code = (p.get("UF") or p.get("uf") or "").upper().strip()
            apoiado = float(
                p.get("valor_apoiado") or p.get("valor_captado") or
                p.get("valor_projeto") or 0
            )
            cgccpf     = str(p.get("cgccpf") or p.get("cgc_cpf") or "")
            entidade_id = entidade_cache.get(cgccpf)
            seg_id     = _extract_id(p.get("segmento"), seg_map)
            # resolve area from segmento when API doesn't return it directly
            area_id    = _extract_id(p.get("area"), area_map)
            if area_id is None and seg_id is not None:
                area_id = conn.execute(
                    "SELECT area_id FROM segmentos WHERE id=?", (seg_id,)
                ).fetchone()
                area_id = area_id[0] if area_id else None
            ano = str(p.get("ano_projeto") or "")
            created = f"20{ano}-01-01" if len(ano) == 2 else None

            rows.append((
                pronac,
                nome,
                entidade_id,
                str(pronac),
                uf_code,
                p.get("mecanismo") or "",
                p.get("enquadramento") or None,
                p.get("processo") or None,
                None,
                (p.get("situacao") or "")[:255],
                p.get("providencia") or None,
                p.get("sinopse") or p.get("resumo") or p.get("sintese") or None,
                float(p.get("valor_solicitado") or 0),
                float(p.get("valor_aprovado")   or 0),
                apoiado,
                None,
                estado_map.get(uf_code),
                created,
                created,
                seg_id,
                None,
                area_id,
                _urlize(nome),
            ))

        if rows:
            conn.executemany("""
                INSERT OR IGNORE INTO projetos
                    (id, nome, entidade_id, numero, uf, mecanismo, enquadramento,
                     processo, situacao_at, situacao, providencia, sintese,
                     solicitado, aprovado, apoiado, liberado_at, estado_id,
                     created_at, updated_at, segmento_id, apoiadores, area_id, urlized)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, rows)
            conn.commit()
            inserted += len(rows)

        offset += batch_size
        elapsed = time.time() - t0
        rate = inserted / elapsed if elapsed > 0 else 0
        eta  = (total - offset) / (offset / elapsed) if offset > 0 and elapsed > 0 else 0
        print(f"  {offset:>6}/{total} | +{inserted} novos | {rate:.1f}/s | ETA {eta/60:.0f}min  ",
              end="\r")

        if stop or offset >= total:
            break

    print(f"\n  projetos: {inserted} novos inseridos")
    return inserted


# ── sync incentivadores → entidades ──────────────────────────────────────────

def sync_incentivadores(session, conn):
    _, _, estado_map = _build_maps(conn)

    first = api_get(session, "/incentivadores", {"limit": 1})
    total = first.get("total", 0)
    print(f"  Total incentivadores na API: {total}")

    max_id = conn.execute("SELECT MAX(id) FROM entidades").fetchone()[0] or 0
    # rough skip: assume API returns in ascending id order
    start_offset = max(0, max_id - 200)
    print(f"  max entidade id no banco: {max_id}  |  começando no offset ~{start_offset}")

    offset, inserted, t0 = start_offset, 0, time.time()

    while offset < total:
        data = api_get(session, "/incentivadores", {"limit": 100, "offset": offset})
        items = (
            data.get("_embedded", {}).get("incentivadores", []) or
            data.get("incentivadores", [])
        )
        if not items:
            break

        rows = []
        for iv in items:
            eid = int(iv.get("id") or 0)
            if not eid:
                continue
            uf = (iv.get("UF") or iv.get("uf") or "").upper().strip()
            rows.append((
                eid,
                (iv.get("nome") or "")[:255],
                iv.get("cgccpf") or iv.get("cgc_cpf") or "",
                iv.get("responsavel") or None,
                None, None, None,
                uf or None,
                None, None, None, None, None,
                None, None, None,
                None, None, None,
                None, None,
                estado_map.get(uf),
                None, None, None,
            ))

        if rows:
            conn.executemany("""
                INSERT OR IGNORE INTO entidades
                    (id, nome, cnpjcpf, responsavel, logradouro, cidade_nome,
                     cep, uf, email, tel_res, tel_cel, tel_fax, tel_com,
                     patrocinador, proponente, empresa,
                     urlized, projetos_count, projetos_sum,
                     incentivos_count, incentivos_sum, estado_id,
                     projetos_liberados, last_incentivo, cidade_id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, rows)
            conn.commit()
        inserted += len(rows)
        offset += 100

        elapsed = time.time() - t0
        print(f"  {offset:>6}/{total} | {inserted} inseridos | "
              f"{inserted/elapsed:.1f}/s  ", end="\r")

    print(f"\n  incentivadores: {inserted} inseridos")
    return inserted


# ── sync captações → incentivos ───────────────────────────────────────────────

def sync_captacoes(session, conn):
    """Bulk /captacoes — endpoint não existe no SALIC API v1. Use sync_por_projeto."""
    print("  /captacoes bulk não disponível — use: python3 db/mostre.py sync por_projeto")
    return 0


# ── sync lento por projeto: captações + proponente ────────────────────────────

def _db_write(conn, sql, params=()):
    """Execute a write with retry on lock."""
    for attempt in range(10):
        try:
            conn.execute(sql, params)
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < 9:
                time.sleep(0.5 * (attempt + 1))
            else:
                raise


def _get_or_create_entidade(conn, cgccpf, nome, uf, estado_map):
    """Devolve id da entidade, criando se não existir."""
    if not cgccpf:
        return None
    row = conn.execute(
        "SELECT id FROM entidades WHERE cnpjcpf = ? LIMIT 1", (cgccpf,)
    ).fetchone()
    if row:
        return row[0]
    _db_write(conn, """
        INSERT OR IGNORE INTO entidades (nome, cnpjcpf, uf, estado_id)
        VALUES (?,?,?,?)
    """, (
        (nome or "")[:255],
        cgccpf,
        uf or None,
        estado_map.get((uf or "").upper().strip()),
    ))
    conn.commit()
    return conn.execute(
        "SELECT id FROM entidades WHERE cnpjcpf = ? LIMIT 1", (cgccpf,)
    ).fetchone()[0]


def _get_or_create_segmento(conn, nome, area_id):
    if not nome:
        return None
    row = conn.execute(
        "SELECT id FROM segmentos WHERE lower(nome) = lower(?) LIMIT 1", (nome,)
    ).fetchone()
    if row:
        return row[0]
    _db_write(conn, "INSERT OR IGNORE INTO segmentos (nome, area_id, urlized) VALUES (?,?,?)",
              (nome[:255], area_id, _urlize(nome)))
    conn.commit()
    return conn.execute(
        "SELECT id FROM segmentos WHERE lower(nome) = lower(?) LIMIT 1", (nome,)
    ).fetchone()[0]


def _get_or_create_area(conn, nome, area_map):
    if not nome:
        return None, area_map
    key = nome.lower().strip()
    if key in area_map:
        return area_map[key], area_map
    row = conn.execute(
        "SELECT id FROM areas WHERE lower(nome) = lower(?) LIMIT 1", (nome,)
    ).fetchone()
    if row:
        area_map[key] = row[0]
        return row[0], area_map
    _db_write(conn, "INSERT OR IGNORE INTO areas (nome, urlized) VALUES (?,?)",
              (nome[:255], _urlize(nome)))
    conn.commit()
    new_id = conn.execute(
        "SELECT id FROM areas WHERE lower(nome) = lower(?) LIMIT 1", (nome,)
    ).fetchone()[0]
    area_map[key] = new_id
    return new_id, area_map


async def sync_por_projeto(session, conn, delay=0.2):
    """
    Para cada projeto novo sem metadados: busca /projetos/{pronac},
    preenche segmento_id, area_id, entidade_id, created_at e captações.
    Resumível: pula projetos que já têm entidade_id e area_id resolvidos.
    """
    area_map, seg_map, estado_map = _build_maps(conn)

    pending = conn.execute("""
        SELECT id, numero FROM projetos
        WHERE id > 142138
          AND (area_id IS NULL OR entidade_id IS NULL)
        ORDER BY id
    """).fetchall()

    total = len(pending)
    print(f"  {total} projetos pendentes de detalhes")

    upd, inc_new, rec_new, done, t0 = 0, 0, 0, 0, time.time()
    cf_failures = 0

    for projeto_id, pronac in pending:
        try:
            d = api_get(session, f"/projetos/{pronac}", {})
            cf_failures = 0
        except Exception as e:
            cf_failures += 1
            if cf_failures >= 5:
                print(f"\n  CF session expirada — renovando...")
                session = await get_cf_session()
                cf_failures = 0
            done += 1
            await asyncio.sleep(delay)
            continue

        # ── resolve area ──
        area_nome = d.get("area") or ""
        area_id, area_map = _get_or_create_area(conn, area_nome, area_map)

        # ── resolve segmento ──
        seg_nome = d.get("segmento") or ""
        seg_id = None
        if seg_nome:
            seg_id = seg_map.get(seg_nome.lower().strip())
            if not seg_id:
                seg_id = _get_or_create_segmento(conn, seg_nome, area_id)
                if seg_id:
                    seg_map[seg_nome.lower().strip()] = seg_id

        # ── resolve entidade (proponente) ──
        cgccpf  = str(d.get("cgccpf") or "")
        nome_p  = str(d.get("proponente") or "")
        uf_p    = str(d.get("UF") or d.get("uf") or "")
        ent_id  = _get_or_create_entidade(conn, cgccpf, nome_p, uf_p, estado_map)

        # ── created_at from data_inicio ──
        created = d.get("data_inicio") or None

        # ── update projeto record ──
        _db_write(conn, """
            UPDATE projetos SET
                area_id     = COALESCE(area_id, ?),
                segmento_id = COALESCE(segmento_id, ?),
                entidade_id = COALESCE(entidade_id, ?),
                created_at  = COALESCE(created_at, ?),
                updated_at  = COALESCE(updated_at, ?)
            WHERE id = ?
        """, (area_id, seg_id, ent_id, created, created, projeto_id))
        upd += 1

        # ── captações embedded ──
        caps = d.get("_embedded", {}).get("captacoes", [])
        for c in caps:
            cgc  = str(c.get("cgccpf") or c.get("cgc_cpf") or "")
            nom  = str(c.get("nome_doador") or "")
            uf_c = str(c.get("UF") or c.get("uf") or "")
            val  = float(c.get("valor") or 0)
            drec = str(c.get("data_recibo") or c.get("data") or "") or None
            if not cgc:
                continue
            eid = _get_or_create_entidade(conn, cgc, nom, uf_c, estado_map)
            if not eid:
                continue
            inc_row = conn.execute(
                "SELECT id FROM incentivos WHERE projeto_id=? AND entidade_id=?",
                (projeto_id, eid)
            ).fetchone()
            if inc_row:
                inc_id = inc_row[0]
                _db_write(conn, """
                    UPDATE incentivos SET valor=valor+?, recibos_count=recibos_count+1,
                        last_recibo_at=MAX(COALESCE(last_recibo_at,''),COALESCE(?,''))
                    WHERE id=?
                """, (val, drec, inc_id))
            else:
                _db_write(conn, """
                    INSERT INTO incentivos (projeto_id,entidade_id,valor,recibos_count,last_recibo_at)
                    VALUES (?,?,?,1,?)
                """, (projeto_id, eid, val, drec))
                inc_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                inc_new += 1
            _db_write(conn, "INSERT INTO recibos (incentivo_id,data,valor) VALUES (?,?,?)",
                      (inc_id, drec, val))
            rec_new += 1

        conn.commit()
        done += 1
        if done % 50 == 0:
            elapsed = time.time() - t0
            eta = (total - done) * elapsed / done if done > 0 else 0
            print(f"  {done}/{total} | upd={upd} | inc={inc_new} | rec={rec_new} | ETA {eta/60:.0f}min  ",
                  end="\r")
        await asyncio.sleep(delay)

    conn.commit()
    print(f"\n  por_projeto: {done} proj | {upd} atualizados | {inc_new} inc | {rec_new} rec")
    return upd


# ── backfill campos deriváveis ────────────────────────────────────────────────

def backfill(conn):
    """Corrige campos que o API não retorna mas podem ser derivados do banco."""
    # area_id a partir do segmento
    r = conn.execute("""
        UPDATE projetos
        SET area_id = (SELECT area_id FROM segmentos WHERE id = segmento_id)
        WHERE area_id IS NULL AND segmento_id IS NOT NULL
    """)
    print(f"  area_id:      {r.rowcount} projetos corrigidos")

    # entidade_id a partir de cgccpf — só possível se entidade já está no banco
    # (proponentes que também aparecem como incentivadores)
    r = conn.execute("""
        UPDATE projetos
        SET entidade_id = (
            SELECT e.id FROM entidades e
            WHERE e.cnpjcpf = projetos.numero
            LIMIT 1
        )
        WHERE entidade_id IS NULL
    """)
    # above won't help much; entidade lookup really needs the cgccpf per-project
    # which we now capture in sync_projetos going forward
    print(f"  entidade_id:  (capturado online no próximo sync)")

    conn.commit()
    print("Backfill concluído.")


# ── main ───────────────────────────────────────────────────────────────────

async def run_sync(what):
    print("Obtendo sessão Cloudflare (abre Chrome uma vez)...")
    session = await get_cf_session()

    conn = connect()
    try:
        if what in ("all", "projetos"):
            print("\n[projetos]")
            sync_projetos(session, conn)

        if what in ("all", "incentivos", "incentivadores", "entidades"):
            print("\n[incentivadores → entidades]")
            sync_incentivadores(session, conn)

        if what in ("captacoes",):
            print("\n[captações bulk]")
            sync_captacoes(session, conn)

        if what in ("por_projeto",):
            print("\n[captações + entidades por projeto (lento)]")
            await sync_por_projeto(session, conn)

        if what == "all":
            print("\n[backfill campos deriváveis]")
            backfill(conn)
    finally:
        conn.close()

    print("\nSync concluído.")


if __name__ == "__main__":
    cmd  = sys.argv[1] if len(sys.argv) > 1 else "stats"
    arg2 = sys.argv[2] if len(sys.argv) > 2 else "all"

    if cmd == "sync":
        asyncio.run(run_sync(arg2))

    elif cmd == "backfill":
        conn = connect()
        backfill(conn)
        conn.close()

    elif cmd == "stats":
        stats()

    elif cmd == "query":
        import pandas as pd
        q = " ".join(sys.argv[2:])
        conn = connect()
        print(pd.read_sql(q, conn).to_string(index=False))
        conn.close()

    else:
        print(__doc__)
