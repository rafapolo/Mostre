"""
Mostre!me — DuckDB local + scraper SALIC API

Uso:
    python3 db/mostre.py load          # importa backups CSV.gz → DuckDB
    python3 db/mostre.py sync          # sincroniza projetos + incentivos novos
    python3 db/mostre.py sync projetos
    python3 db/mostre.py sync incentivos
    python3 db/mostre.py stats
    python3 db/mostre.py query "SELECT ..."
"""

import sys, json, asyncio, time, duckdb, requests
from pathlib import Path

DB_PATH  = Path(__file__).parent / "mostre.duckdb"
BKP_PATH = Path(__file__).parent / "bkp"
API_HOST = "https://api.salic.cultura.gov.br"
API_BASE = f"{API_HOST}/api/v1"
CHROME   = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# ── banco ──────────────────────────────────────────────────────────────────

def connect():
    return duckdb.connect(str(DB_PATH))


def load_backups():
    con = connect()
    tables = [
        ("projetos",   "projetos.csv.gz"),
        ("entidades",  "entidades.csv.gz"),
        ("incentivos", "incentivos.csv.gz"),
        ("recibos",    "recibos.csv.gz"),
        ("cidades",    "cidades.csv.gz"),
        ("segmentos",  "segmentos.csv.gz"),
        ("areas",      "areas.csv.gz"),
        ("estados",    "estados.csv.gz"),
        ("links",      "links.csv.gz"),
        ("clicks",     "clicks.csv.gz"),
    ]
    for name, fname in tables:
        path = BKP_PATH / fname
        if not path.exists():
            print(f"  skip {fname}")
            continue
        con.execute(f"DROP TABLE IF EXISTS {name}")
        con.execute(f"""
            CREATE TABLE {name} AS
            SELECT * FROM read_csv_auto('{path}', ignore_errors=true)
        """)
        n = con.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
        print(f"  {name:<12} {n:>8} registros")
    con.close()
    print(f"\nBanco salvo em {DB_PATH}")


def ensure_tables(con):
    con.execute("DROP TABLE IF EXISTS projetos_api")
    con.execute("DROP TABLE IF EXISTS entidades_api")
    con.execute("DROP TABLE IF EXISTS doacoes_api")
    con.execute("""
        CREATE TABLE projetos_api (
            id              BIGINT PRIMARY KEY,
            nome            VARCHAR,
            entidade_id     BIGINT,
            numero          VARCHAR,
            uf              VARCHAR,
            mecanismo       VARCHAR,
            enquadramento   VARCHAR,
            processo        VARCHAR,
            situacao_at     VARCHAR,
            situacao        VARCHAR,
            providencia     VARCHAR,
            sintese         VARCHAR,
            solicitado      DOUBLE,
            aprovado        DOUBLE,
            apoiado         DOUBLE,
            liberado_at     VARCHAR,
            estado_id       BIGINT,
            created_at      DATE,
            updated_at      DATE,
            segmento_id     BIGINT,
            apoiadores      VARCHAR,
            area_id         BIGINT,
            urlized         VARCHAR,
            synced_at       TIMESTAMP DEFAULT NOW()
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS entidades_api (
            id                 BIGINT PRIMARY KEY,
            nome               VARCHAR,
            cnpjcpf            VARCHAR,
            responsavel        VARCHAR,
            logradouro         VARCHAR,
            cidade_nome        VARCHAR,
            cep                VARCHAR,
            uf                 VARCHAR,
            email              VARCHAR,
            tel_res            VARCHAR,
            tel_cel            VARCHAR,
            tel_fax            VARCHAR,
            tel_com            VARCHAR,
            patrocinador       BIGINT,
            proponente         BIGINT,
            empresa            BIGINT,
            created_at         TIMESTAMP DEFAULT NOW(),
            updated_at         TIMESTAMP DEFAULT NOW(),
            urlized            VARCHAR,
            projetos_count     BIGINT,
            projetos_sum       DOUBLE,
            incentivos_count   BIGINT,
            incentivos_sum     DOUBLE,
            estado_id          BIGINT,
            projetos_liberados BIGINT,
            last_incentivo     VARCHAR,
            cidade_id          BIGINT
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS doacoes_api (
            id               BIGINT,
            projeto_id       BIGINT,
            entidade_id      BIGINT,
            valor            DOUBLE,
            created_at       TIMESTAMP DEFAULT NOW(),
            updated_at       TIMESTAMP DEFAULT NOW(),
            recibos_count    BIGINT,
            last_recibo_at   VARCHAR
        )
    """)


def stats():
    con = connect()
    print("=== BACKUP (CSV 2019) ===")
    for t in ["projetos", "entidades", "incentivos", "recibos", "links", "clicks"]:
        try:
            n = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  {t:<20} {n:>8}")
        except:
            print(f"  {t:<20}  (ausente)")

    print("\n=== API SYNC ===")
    for t in ["projetos_api", "entidades_api", "doacoes_api"]:
        try:
            n = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  {t:<20} {n:>8}")
        except:
            print(f"  {t:<20}  (ausente)")

    print("\n=== TOP PATROCINADORES (backup) ===")
    try:
        print(con.execute("""
            SELECT LEFT(e.nome, 50) as patrocinador,
                   COUNT(i.id) as projetos,
                   PRINTF('R$ %,.0f M', SUM(i.valor)/1e6) as total
            FROM incentivos i JOIN entidades e ON e.id = i.entidade_id
            GROUP BY e.nome ORDER BY SUM(i.valor) DESC LIMIT 8
        """).df().to_string(index=False))
    except Exception as e:
        print(f"  {e}")

    print("\n=== PROJETOS POR UF (backup, com captação) ===")
    try:
        print(con.execute("""
            SELECT uf, COUNT(*) as n,
                   PRINTF('R$ %,.0f M', SUM(apoiado)/1e6) as apoiado
            FROM projetos WHERE apoiado > 0
            GROUP BY uf ORDER BY SUM(apoiado) DESC LIMIT 10
        """).df().to_string(index=False))
    except Exception as e:
        print(f"  {e}")

    con.close()


# ── cloudflare: pega cookie com Chrome real, usa requests pra tudo ──────────

async def get_cf_session():
    """Abre Chrome uma vez, resolve CF, devolve cookies+UA pra requests."""
    import nodriver as uc

    browser = await uc.start(
        headless=False,
        browser_executable_path=CHROME,
        sandbox=False,
    )
    await asyncio.sleep(2)  # espera Chrome inicializar
    page = await browser.get(f"{API_HOST}/api/v1/projetos?limit=1&format=json")
    print("  aguardando Cloudflare...", end=" ", flush=True)
    await asyncio.sleep(12)

    # confirma que passou (tem JSON)
    raw = await page.evaluate("document.body.innerText")
    if not raw or "Performing security" in raw:
        browser.stop()
        raise RuntimeError("CF challenge não passou. Tente de novo.")

    # extrai cookies e user-agent
    cookies = await browser.cookies.get_all()
    ua = await page.evaluate("navigator.userAgent")
    browser.stop()

    session = requests.Session()
    session.headers.update({
        "User-Agent": ua,
        "Accept": "application/json",
    })
    for c in cookies:
        session.cookies.set(c.name, c.value, domain=c.domain)

    print(f"ok ({len(cookies)} cookies)")
    return session


def api_get(session, path, params):
    """Requisição à API usando a sessão com cookies CF."""
    r = session.get(f"{API_BASE}{path}", params={**params, "format": "json"}, timeout=20)
    r.raise_for_status()
    return r.json()


# ── lookup maps ──────────────────────────────────────────────────────────────

def _build_maps(con):
    area_map = {}
    seg_map = {}
    estado_map = {}
    try:
        for r in con.execute("SELECT id, nome FROM areas").fetchall():
            area_map[r[1].lower().strip()] = r[0]
    except:
        pass
    try:
        for r in con.execute("SELECT id, nome FROM segmentos").fetchall():
            seg_map[r[1].lower().strip()] = r[0]
    except:
        pass
    try:
        for r in con.execute("SELECT id, sigla FROM estados").fetchall():
            estado_map[r[1].upper().strip()] = r[0]
    except:
        pass
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
    import re
    s = s.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    return re.sub(r'[-\s]+', '-', s).strip('-')


# ── sync projetos ───────────────────────────────────────────────────────────

def sync_projetos(session, con):
    area_map, seg_map, estado_map = _build_maps(con)

    try:
        last = con.execute("SELECT MAX(CAST(numero AS INTEGER)) FROM projetos_api").fetchone()[0] or 0
    except:
        last = 0
    try:
        last_bkp = con.execute(
            "SELECT MAX(TRY_CAST(numero AS INTEGER)) FROM projetos"
        ).fetchone()[0] or 0
        last = max(last, last_bkp)
    except:
        pass

    first = api_get(session, "/projetos", {"limit": 1})
    total = first.get("total", 0)
    print(f"  PRONAC mais recente no banco: {last}")
    print(f"  Total na API: {total}")

    offset, inserted, t0 = 0, 0, time.time()
    batch_size = 100

    while True:
        data = api_get(session, "/projetos", {"limit": batch_size, "offset": offset})
        items = data.get("_embedded", {}).get("projetos", [])
        if not items:
            break

        rows, stop = [], False
        for p in items:
            pronac = int(p.get("PRONAC") or 0)
            if pronac <= last:
                stop = True
                continue

            nome      = (p.get("nome") or "")[:255]
            uf_code   = (p.get("UF") or "").upper().strip()

            rows.append((
                pronac,                                # id
                nome,                                  # nome
                None,                                  # entidade_id
                str(pronac),                           # numero
                uf_code,                               # uf
                p.get("mecanismo") or "",              # mecanismo
                None,                                  # enquadramento
                None,                                  # processo
                None,                                  # situacao_at
                (p.get("situacao") or "")[:255],       # situacao
                None,                                  # providencia
                None,                                  # sintese
                float(p.get("valor_solicitado") or 0), # solicitado
                float(p.get("valor_aprovado")   or 0), # aprovado
                float(p.get("valor_apoiado")    or 0), # apoiado
                None,                                  # liberado_at
                estado_map.get(uf_code),               # estado_id
                None,                                  # created_at
                None,                                  # updated_at
                _extract_id(p.get("segmento"), seg_map),   # segmento_id
                None,                                  # apoiadores
                _extract_id(p.get("area"), area_map),       # area_id
                _urlize(nome),                         # urlized
            ))

        if rows:
            con.executemany("""
                INSERT OR REPLACE INTO projetos_api
                    (id, nome, entidade_id, numero, uf, mecanismo,
                     enquadramento, processo, situacao_at, situacao,
                     providencia, sintese, solicitado, aprovado, apoiado,
                     liberado_at, estado_id, created_at, updated_at,
                     segmento_id, apoiadores, area_id, urlized)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, rows)
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


# ── sync incentivadores → entidades_api ────────────────────────────────────

def sync_incentivadores(session, con):
    area_map, seg_map, estado_map = _build_maps(con)

    first = api_get(session, "/incentivadores", {"limit": 1})
    total = first.get("total", 0)
    print(f"  Total incentivadores na API: {total}")

    offset, inserted, t0 = 0, 0, time.time()

    while offset < total:
        data = api_get(session, "/incentivadores", {"limit": 100, "offset": offset})
        items = data.get("_embedded", {}).get("incentivadores", [])
        if not items:
            break

        rows = [(
            int(iv.get("id") or 0),                     # id
            (iv.get("nome") or "")[:255],                # nome
            iv.get("cgccpf") or "",                      # cnpjcpf
            None,                                        # responsavel
            None,                                        # logradouro
            None,                                        # cidade_nome
            None,                                        # cep
            None,                                        # uf
            None,                                        # email
            None,                                        # tel_res
            None,                                        # tel_cel
            None,                                        # tel_fax
            None,                                        # tel_com
            None,                                        # patrocinador
            None,                                        # proponente
            None,                                        # empresa
            None,                                        # urlized
            None,                                        # projetos_count
            None,                                        # projetos_sum
            None,                                        # incentivos_count
            None,                                        # incentivos_sum
            None,                                        # estado_id
            None,                                        # projetos_liberados
            None,                                        # last_incentivo
            None,                                        # cidade_id
        ) for iv in items]

        con.executemany("""
            INSERT OR REPLACE INTO entidades_api
                (id, nome, cnpjcpf, responsavel, logradouro, cidade_nome,
                 cep, uf, email, tel_res, tel_cel, tel_fax, tel_com,
                 patrocinador, proponente, empresa,
                 urlized, projetos_count, projetos_sum,
                 incentivos_count, incentivos_sum, estado_id,
                 projetos_liberados, last_incentivo, cidade_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, rows)
        inserted += len(rows)
        offset += 100

        elapsed = time.time() - t0
        print(f"  {offset:>6}/{total} | {inserted} inseridos | "
              f"{inserted/elapsed:.1f}/s  ", end="\r")

    print(f"\n  incentivadores: {inserted} inseridos")
    return inserted


# ── main ───────────────────────────────────────────────────────────────────

async def run_sync(what):
    con = connect()
    ensure_tables(con)

    print("Obtendo sessão Cloudflare (abre Chrome uma vez)...")
    session = await get_cf_session()

    try:
        if what in ("all", "projetos"):
            print("\n[projetos]")
            sync_projetos(session, con)

        if what in ("all", "incentivos", "incentivadores", "entidades"):
            print("\n[incentivadores → entidades_api]")
            sync_incentivadores(session, con)

    finally:
        con.close()

    print("\nSync concluído.")


if __name__ == "__main__":
    cmd  = sys.argv[1] if len(sys.argv) > 1 else "stats"
    arg2 = sys.argv[2] if len(sys.argv) > 2 else "all"

    if cmd == "load":
        print("Carregando backups CSV → DuckDB...")
        load_backups()

    elif cmd == "sync":
        asyncio.run(run_sync(arg2))

    elif cmd == "stats":
        stats()

    elif cmd == "query":
        q = " ".join(sys.argv[2:])
        con = connect()
        print(con.execute(q).df().to_string())
        con.close()

    else:
        print(__doc__)
