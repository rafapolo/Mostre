"""
Mostre!me — scraper SALIC API → SQLite

Uso:
    python3 db/mostre.py sync                    # projetos + incentivadores + captações
    python3 db/mostre.py sync projetos
    python3 db/mostre.py sync incentivos         # incentivadores + captações
    python3 db/mostre.py sync captacoes
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
    conn = sqlite3.connect(str(SQLITE_DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
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


def api_get(session, path, params):
    r = session.get(f"{API_BASE}{path}", params={**params, "format": "json"}, timeout=20)
    r.raise_for_status()
    return r.json()


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

            rows.append((
                pronac,
                nome,
                None,
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
                None,
                None,
                _extract_id(p.get("segmento"), seg_map),
                None,
                _extract_id(p.get("area"), area_map),
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

    offset, inserted, t0 = 0, 0, time.time()

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
    first = api_get(session, "/captacoes", {"limit": 1})
    total = first.get("total", 0)
    print(f"  Total captações na API: {total}")

    offset, all_caps, t0 = 0, [], time.time()

    while offset < total:
        data = api_get(session, "/captacoes", {"limit": 100, "offset": offset})
        items = (
            data.get("_embedded", {}).get("captacoes", []) or
            data.get("captacoes", [])
        )
        if not items:
            break

        for c in items:
            pronac   = int(c.get("PRONAC") or c.get("pronac") or 0)
            cgccpf   = str(c.get("cgccpf") or c.get("cgc_cpf") or "")
            valor    = float(c.get("valor") or 0)
            data_rec = str(c.get("data_recibo") or c.get("data") or "")
            if pronac and cgccpf:
                all_caps.append((pronac, cgccpf, valor, data_rec))

        offset += 100
        elapsed = time.time() - t0
        print(f"  {offset:>6}/{total} | {len(all_caps)} captações | "
              f"{len(all_caps)/elapsed:.1f}/s  ", end="\r")

    print(f"\n  Agregando {len(all_caps)} captações...")

    # aggregate per (pronac, cgccpf)
    agg = {}
    for pronac, cgccpf, valor, data_rec in all_caps:
        key = (pronac, cgccpf)
        if key not in agg:
            agg[key] = [0.0, 0, ""]
        agg[key][0] += valor
        agg[key][1] += 1
        if data_rec > agg[key][2]:
            agg[key][2] = data_rec

    inserted = 0
    for (pronac, cgccpf), (soma, count, last_date) in agg.items():
        row = conn.execute(
            "SELECT id FROM projetos WHERE CAST(numero AS INTEGER) = ? LIMIT 1",
            (pronac,)
        ).fetchone()
        if not row:
            continue
        projeto_id = row[0]

        row = conn.execute(
            "SELECT id FROM entidades WHERE cnpjcpf = ? LIMIT 1",
            (cgccpf,)
        ).fetchone()
        if not row:
            continue
        entidade_id = row[0]

        existing = conn.execute(
            "SELECT id FROM incentivos WHERE projeto_id = ? AND entidade_id = ?",
            (projeto_id, entidade_id)
        ).fetchone()
        if not existing:
            conn.execute("""
                INSERT INTO incentivos (projeto_id, entidade_id, valor, recibos_count, last_recibo_at)
                VALUES (?,?,?,?,?)
            """, (projeto_id, entidade_id, soma, count, last_date or None))
            inserted += 1

    conn.commit()
    print(f"  incentivos: {inserted} novos inseridos")
    return inserted


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

        if what in ("all", "captacoes", "incentivos"):
            print("\n[captações → incentivos]")
            sync_captacoes(session, conn)
    finally:
        conn.close()

    print("\nSync concluído.")


if __name__ == "__main__":
    cmd  = sys.argv[1] if len(sys.argv) > 1 else "stats"
    arg2 = sys.argv[2] if len(sys.argv) > 2 else "all"

    if cmd == "sync":
        asyncio.run(run_sync(arg2))

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
