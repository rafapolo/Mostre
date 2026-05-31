# Mostre!me

Plataforma de dados abertos construída em Ruby on Rails que agrega, estrutura e expõe informações públicas do governo brasileiro — cultura, educação e eleições — com rastreamento de links desde 2009.

---

## Módulos

### Links — desde 2009

Criador de referências curtas no domínio `mostre.me`. Cada atalho registra **quando** e **de onde** o link foi clicado, sem armazenar dados do visitante, explorando os princípios nativos do protocolo HTTP.

```
mostre.me/:atalho → qualquer URL na web
```

- Rastreamento por IP, referrer e timestamp
- Stats por link via `/links/stats`
- Sem cookies, sem identificação de usuário

**1.495 links criados — 34.981 cliques registrados**

---

### Cultura — desde 2010

Mineração e navegação dos dados do **SalicNet** (sistema oficial do Ministério da Cultura). Todos os projetos culturais aprovados via Lei Rouanet e mecanismos do FNC estão indexados e navegáveis.

**O que está mapeado:**

| Entidade | Total | Descrição |
|---|---|---|
| `Projetos` | 126.969 | Nome, UF, área cultural, segmento, mecanismo, situação, valores |
| `Projetos aprovados` | 24.441 | Apoiados com valor > 0 |
| `Entidades` | 102.448 | Proponentes e patrocinadores, com CNPJ/CPF, estado, cidade |
| `Patrocinadores` | 50.344 | Empresas e pessoas que incentivaram projetos |
| `Proponentes` | 52.072 | Entidades que submeteram projetos |
| `Incentivos` | 138.095 | Quem patrocinou qual projeto e quanto |
| `Recibos` | 216.499 | Comprovantes de repasse de cada incentivo |
| `Áreas` | 7 | Taxonomia cultural oficial do MinC |
| `Segmentos` | 106 | Subdivisões por área |
| `Cidades` | 5.599 | Geolocalização de projetos e entidades |

**Total incentivado: R$ 8,6 bilhões**

**Projetos aprovados por área:**

| Área | Projetos |
|---|---|
| Música | 5.014 |
| Artes Cênicas | 4.819 |
| Humanidades | 4.105 |
| Artes Integradas | 3.474 |
| Audiovisual | 3.104 |
| Patrimônio Cultural | 2.305 |
| Artes Visuais | 1.620 |

**Top 5 patrocinadores:**

| Patrocinador | Total incentivado |
|---|---|
| Petróleo Brasileiro S.A — Petrobrás | R$ 1,31 bilhão |
| Vale S/A | R$ 299 milhões |
| Banco do Brasil S.A | R$ 259 milhões |
| Eletrobrás | R$ 191 milhões |
| BNDES | R$ 178 milhões |

**Visualizações geradas:**

- Grafos em formato `.dot` (Graphviz) para análise de redes de patrocínio
- Exportação em `.gexf` para visualização no Gephi
- JSON para treemaps D3.js com distribuição por área cultural

---

### Educação — desde 2015

Mapeamento do **eMec** (sistema do Ministério da Educação), cobrindo todo o sistema nacional de educação pública e privada.

**O que está mapeado:**

| Entidade | Descrição |
|---|---|
| `Mantenedoras` | CNPJ, natureza jurídica, representante legal |
| `Instituições` | Nome, sigla, categoria, site, telefone, data de credenciamento |
| `Cursos` | Nome, grau, modalidade, código MEC |
| `Endereços` | Localização completa de cada campus |

O crawler percorre o eMec via Mechanize, extrai dados de cada instituição e seus cursos, e vincula tudo por código MEC.

---

### Eleições

Dados do **TSE** (Tribunal Superior Eleitoral) sobre financiamento de campanha.

- Candidatos, doadores, comitês
- Rede de doações: quem doou, quanto, para quem
- Geração de grafos de fluxo financeiro eleitoral

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Ruby on Rails 8.1 |
| Banco de dados | SQLite (dev/prod) |
| Frontend | HAML, Slim, Bootstrap 5, Stimulus |
| Paginação | Pagy 9 |
| Crawler | Mechanize |
| Jobs | Sidekiq |
| Rastreamento | Impressionist |
| Servidor | Puma |

---

## Fontes de dados

- **SalicNet** — `salicnet.cultura.gov.br` — projetos e incentivos culturais (Lei Rouanet)
- **eMec** — `emec.mec.gov.br` — instituições e cursos de ensino superior
- **TSE** — dados de prestação de contas eleitoral

---

## Rodando localmente

```bash
bundle install
rails db:create db:schema:load
rails s
```

Para atualizar os dados do MinC:

```bash
rails minc:update:new       # novos projetos
rails minc:update:projetos  # atualiza projetos existentes
rails minc:update:recibos   # recibos dos incentivos
```

Para gerar grafos de rede:

```bash
rails minc:top100           # top 20 patrocinadores → projetos → proponentes
rails minc:bellini          # grafo de uma entidade específica
```

---

## Dados de datas nos projetos culturais

A coluna **Ano** na listagem de projetos exibe `situacao_at` — a data em que o governo atualizou o status do projeto no SalicWeb. Esse campo vem diretamente do HTML da fonte (`sistemas.cultura.gov.br`) e parou de ser preenchido pela fonte original por volta de 2014.

Projetos rastreados após isso chegam sem data de status e aparecem como **"em avaliação"**. O campo `processo` também carrega o ano no formato `/YY-` (ex: `01400.000953/06-21` = 2006), mas igualmente ficou vazio nas raspagens mais recentes.

| Campo | Cobertura | Origem |
|---|---|---|
| `situacao_at` | até jan/2014 | data da última mudança de status no MinC |
| `processo` (`/YY-`) | até 2014 | número de processo governamental com ano embutido |
| `created_at` | todos | data em que o projeto foi rastreado pelo crawler |

Para projetos recentes, `created_at` é a única data disponível — representa quando entraram no sistema, não quando foram registrados no MinC.

---

## 2026 — Retomada com auxílio de LLMs

Depois de anos com a interface essencialmente congelada no design de 2014, em maio de 2026 iniciamos uma retomada do projeto com apoio de modelos de linguagem (LLMs). As melhorias foram conduzidas em uma única sessão de trabalho e cobriram:

- **Navegação**: estado ativo no menu lateral por página; largura do sidebar fixada para não oscilar entre páginas
- **Tipografia**: tamanho base aumentado de 13px para 15px; sombras de texto suavizadas do estilo "2px 3px gray" para valores modernos
- **Tabelas**: remoção do `min-width: 880px` fixo; estado vazio explícito ("Nenhum resultado encontrado") em todas as listagens
- **Componentes**: spinner de carregamento migrado do GIF `load.gif` para o spinner nativo do Bootstrap 5; ícones de chevron removidos de links simples de navegação
- **Gráfico treemap**: container corrigido de `<p>` para `<div>`; dimensões fixas (`880×580px`) removidas para renderização responsiva via `viewBox`
- **Rodapé**: altura fixa de 21px substituída por altura automática com padding; anos atualizados
- **Cores**: `bg-info` customizado para `#4183c4` (azul já usado nos links); cursor `crosshair` removido de elementos não-interativos
- **CSS**: regras do sidebar migradas de `#lado` (legado) para `#sidebar`; `#ad` com dimensões movidas do inline para a folha de estilos
