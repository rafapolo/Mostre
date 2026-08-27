# Mostre!me

Projeto pessoal em Ruby on Rails que junta dados públicos do governo brasileiro (cultura, educação e eleições) num único banco SQLite navegável, mais um encurtador de links que roda desde 2009.

Não é uma "plataforma" no sentido de produto mantido — é um site antigo que ficou anos parado com a interface travada em 2014, e que voltou a receber atenção em 2026. Alguns módulos são sólidos e testados, outros são só uma tabela grande importada de um dump que ninguém terminou de explorar. As seções abaixo tentam deixar claro qual é qual.

---

## Módulos

### Links — desde 2009, o módulo mais maduro

Criador de links curtos no domínio `mostre.me`. Cada clique registra IP, referrer e timestamp, sem cookies.

```
mostre.me/:atalho → qualquer URL na web
```

**57.542 links criados — 835.917 cliques registrados** (contagem local, `storage/development.sqlite3`)

---

### Cultura — desde 2010, ativamente sincronizado, com um buraco de 7 anos

Dados do **SalicNet** (Ministério da Cultura) — projetos aprovados via Lei Rouanet, patrocinadores, incentivos, recibos.

| Entidade | Total |
|---|---|
| `Projetos` | 165.657 |
| `Entidades` (proponentes + patrocinadores) | 152.915 |
| `Incentivos` | 173.754 |
| `Recibos` | 245.640 |
| `Cidades` | 5.599 |

**Total incentivado (soma de `incentivos.valor`): ~R$ 10 bilhões**

Área com mais projetos: Artes Integradas (35k), seguida de Música (27k) e Artes Cênicas (24k).

**Limitação conhecida:** os dados vêm de duas fontes diferentes que não se conversam bem —

- Um dump MySQL legado cobrindo até ~2016 (a maior parte do volume histórico).
- A API SALIC ao vivo, sincronizada por `db/mostre.py`, que hoje cobre 2024–2026.
- **O período 2017–2023 ainda não foi sincronizado** (ver `plan/sync_cult_data.md`).
- A API SALIC fica atrás de Cloudflare. O sync `por_projeto` precisa que alguém abra o Chrome localmente para resolver o desafio e salvar cookies em `db/.cf_cookies.json` a cada ~350 requisições — não dá pra rodar isso 100% desatendido.
- O schema antigo (herdado do dump MySQL) e o payload da API não batem campo a campo — colunas como `situacao_at`, `liberado_at` e `apoiadores` estão mortas (nunca preenchidas pelo sync novo). Detalhes em `plan/diff-schema.md`.

---

### Educação — desde 2015, snapshot estático (não é sincronizado)

Crawl único do **eMec** via Mechanize: mantenedoras, instituições, cursos, endereços — **2.632 instituições, 1.038 cursos**. Isso é uma raspagem antiga, não há job rodando para atualizar; os números não refletem o eMec de hoje.

---

### Eleições — dados importados em massa, UI fina

Tabelas de **candidatos** (1.356.855 registros) e **doações** (10.350.196 registros) vieram de um dump e estão no banco, mas a maior parte não tem tela própria além de listagem/busca de candidatos com paginação. Não há, por exemplo, visualização de rede de doações fora do que existe para Cultura — é a área menos desenvolvida do site hoje.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Ruby on Rails 8.1 |
| Banco de dados | SQLite (dev/prod) |
| Frontend | HAML, Slim, Bootstrap 5, Stimulus |
| Paginação | Pagy 9 |
| Crawler legado (educação) | Mechanize |
| Sync ativo (cultura) | `db/mostre.py` — script Python à parte, fora do Rails |
| Jobs | Sidekiq (config presente, uso limitado) |
| Rastreamento de links | Impressionist |
| Servidor | Puma |

---

## Testes

```bash
bin/rails test        # 89 testes (minitest)
bundle exec rspec     # 112 exemplos (rspec)
```

Ambas as suítes passam localmente hoje. Cobrem principalmente controllers e nil-safety — foram adicionadas em 2026 junto com a retomada do projeto, não existiam antes.

---

## Fontes de dados

- **SalicNet / API SALIC** — `api.salic.cultura.gov.br` — projetos e incentivos culturais (Lei Rouanet). Atrás de Cloudflare; sync manual/semi-assistido.
- **eMec** — `emec.mec.gov.br` — instituições e cursos de ensino superior. Raspagem única, desatualizada.
- **TSE** — dados de prestação de contas eleitoral, origem de um dump antigo, não sincronizado com fonte viva.

---

## Rodando localmente

```bash
bundle install
rails db:create db:schema:load
rails s
```

Para sincronizar dados de cultura via API SALIC (requer Chrome local para passar pelo Cloudflare — ver `plan/sync_cult_data.md`):

```bash
python3 db/mostre.py sync              # projetos + incentivadores
python3 db/mostre.py sync por_projeto  # captações + entidades por projeto (lento, resumível)
python3 db/mostre.py stats
```

Existem também tasks Rake mais antigas que atuam sobre o mesmo banco, hoje redundantes com o script Python acima:

```bash
rails minc:update:new       # novos projetos
rails minc:update:projetos  # atualiza projetos existentes
rails minc:update:recibos   # recibos dos incentivos
rails minc:top100           # grafo: top 20 patrocinadores → projetos → proponentes (sem desc no rake -T)
rails minc:bellini           # grafo de uma entidade específica (sem desc no rake -T)
```

---

## Datas nos projetos culturais

A coluna **Ano** na listagem de projetos exibe `situacao_at` — data em que o governo atualizou o status do projeto no SalicWeb antigo. Esse campo parou de ser preenchido pela fonte por volta de 2014, e a API nova nunca teve equivalente, então está permanentemente `nil` para tudo sincronizado depois disso.

| Campo | Cobertura | Origem |
|---|---|---|
| `situacao_at` | até ~2014 | data da última mudança de status, fonte HTML antiga |
| `processo` (`/YY-`) | até ~2014 | número de processo com ano embutido, também parou de vir preenchido |
| `created_at` | todos | data em que o projeto foi rastreado pelo crawler/sync — não a data real do MinC |

Projetos sem `situacao_at` aparecem como "em avaliação" mesmo quando já foram decididos há anos — é uma limitação de dado, não um bug de exibição.

---

## 2026 — retomada com apoio de LLMs

Depois de anos com a interface essencialmente congelada em 2014, em maio de 2026 começou uma retomada com apoio de modelos de linguagem, numa única sessão de trabalho: estado ativo no menu lateral, tipografia maior (13px → 15px), remoção do `min-width: 880px` fixo nas tabelas, estado vazio nas listagens, spinner nativo do Bootstrap no lugar de um GIF, treemap D3 responsivo via `viewBox`, rodapé e cores atualizados. É retoque de superfície — os problemas de dado descritos acima (buraco de sync, schema desencontrado, eleições incompleta) continuam abertos.
