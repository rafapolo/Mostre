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

---

### Cultura — desde 2010

Mineração e navegação dos dados do **SalicNet** (sistema oficial do Ministério da Cultura). Todos os projetos culturais aprovados via Lei Rouanet e mecanismos do FNC estão indexados e navegáveis.

**O que está mapeado:**

| Entidade | Descrição |
|---|---|
| `Projetos` | Nome, UF, área cultural, segmento, mecanismo, situação, valores |
| `Entidades` | Proponentes e patrocinadores, com CNPJ/CPF, estado, cidade |
| `Incentivos` | Quem patrocinou qual projeto e quanto |
| `Recibos` | Comprovantes de repasse de cada incentivo |
| `Áreas / Segmentos` | Taxonomia cultural oficial do MinC |
| `Cidades / Estados` | Geolocalização dos projetos e entidades |

**Dados relevantes extraídos:**

- A **Petrobras** aparece como maior patrocinadora cultural individual, com mais de **R$ 1,32 bilhão** em incentivos acumulados
- A **Orquestra Petrobras Sinfônica** recebeu projetos consecutivos entre 2006 e 2012, cada um na faixa de **R$ 10 milhões**
- Os dados permitem rastrear toda a cadeia: patrocinador → projeto → proponente → valores → recibos

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
| Framework | Ruby on Rails 6.0 |
| Banco de dados | MySQL |
| Frontend | HAML, SASS, Bootstrap 2, jQuery |
| Crawler | Mechanize |
| Jobs | Sidekiq |
| Rastreamento | Impressionist |
| Paginação | will_paginate |
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
