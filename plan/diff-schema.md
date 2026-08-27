# Diff de schema: registros antigos do `db/mostre.duckdb` vs. API SALIC ao vivo

Comparação entre os dados legados de `projetos`/`entidades` (importados de um
dump MySQL antigo para `db/mostre.duckdb`) e os campos que a API SALIC ao
vivo (`https://api.salic.cultura.gov.br/api/v1`) retorna hoje.

## Por que não existe sobreposição literal

A tabela `projetos` antiga vai no máximo até o PRONAC `142138` (importação
do dump MySQL legado). A janela de retenção atual da API ao vivo começa em
`164380` (conforme o comentário em `mostre.py:198`, confirmado ao vivo —
bater em `/projetos/142138` retorna `503 {"message":"internal error"}`,
enquanto `/projetos/164380` retorna um registro completo). Ou seja, não
existe "registro antigo vs. seu equivalente ao vivo" — a API já passou de
tudo que está na tabela legada. Este diff é, portanto, estrutural
(schema-a-schema), não um diff valor-a-valor de uma mesma linha.

## `projetos` (antigo, duckdb) — 23 colunas planas

```
id, nome, entidade_id, numero, uf, mecanismo, enquadramento, processo,
situacao_at, situacao, providencia, sintese, solicitado, aprovado, apoiado,
liberado_at, estado_id, created_at, updated_at, segmento_id, apoiadores,
area_id, urlized
```

## `/projetos/{PRONAC}` (API ao vivo, detalhe, amostra 164380) — 33 chaves de topo + embedded

```
PRONAC, UF, nome, area, segmento, cgccpf, mecanismo, enquadramento, situacao,
providencia, proponente, municipio, ano_projeto, data_inicio, data_termino,
sinopse, resumo, objetivos, justificativa, especificacao_tecnica,
estrategia_execucao, ficha_tecnica, impacto_ambiental, acessibilidade,
democratizacao, tipicidade, tipologia, etapa, outras_fontes,
valor_solicitado, valor_aprovado, valor_projeto, valor_captado, valor_proposta
+ _embedded: divulgacao, local_realizacao, distribuicao, deslocamento,
             certidoes_negativas, captacoes
```

⚠️ O endpoint de listagem em **bulk** (`/projetos?limit=`) retorna um
formato **diferente** do endpoint de detalhe: campos `mecanisnmo`/
`enquadradmento` (com erro de grafia), sem a chave `area` de jeito nenhum, e
`cgccpf` mascarado (`***611479**` vs. sem máscara no detalhe) — o
`mostre.py` já contorna isso com cadeias de fallback.

## Diff campo a campo

| coluna antiga | origem na API | status |
|---|---|---|
| `id` | — | **sem equivalente** — chave surrogate do MySQL legado; não tem relação com o PRONAC (a linha de amostra tinha `id=127161` mas `numero=142138`) |
| `numero` | `PRONAC` | equivale, mas `VARCHAR` vs string da API |
| `entidade_id` | `cgccpf` + `proponente` + `UF`/`municipio` embutidos | **desnormalizado→normalizado**: a API embute o proponente por nome/documento, o app resolve/cria a FK local |
| `processo` | — | **descontinuado** — nenhum campo retorna isso mais |
| `situacao_at` | — | **coluna morta** — fixada em `None` no `sync_projetos` (`mostre.py:276`), a API nunca teve isso |
| `liberado_at` | — | **coluna morta** — nunca preenchida, sem campo correspondente na API |
| `apoiadores` | — | **coluna morta** — os dados de doador por doador agora vivem em `captacoes`/`incentivos`/`recibos` separadas, não nesse campo de texto |
| `sintese` | `sinopse` / `resumo` (cadeia de fallback incluindo `sintese`, que não existe) | **parcial** — os campos narrativos reais da API são mais ricos: `objetivos`, `justificativa`, `especificacao_tecnica`, `estrategia_execucao` ficam todos de fora |
| `apoiado` | `valor_captado` ou `valor_projeto` (fallback incluindo `valor_apoiado`, que não existe) | **misturado** — a API distingue captado (arrecadado) vs. projeto (valor total) vs. `valor_proposta`; o schema antigo colapsa tudo num único número |
| `solicitado`/`aprovado` | `valor_solicitado`/`valor_aprovado` | equivale |
| `mecanismo`/`enquadramento` | mesmo nome (com erro de grafia `mecanisnmo`/`enquadradmento` só na listagem bulk) | equivale, dependendo da grafia do endpoint |
| `uf` | `UF` | equivale, mas a API ainda traz `municipio` (nome da cidade) + código IBGE embutido — não capturado |
| `area_id`/`segmento_id`/`estado_id` | `area`/`segmento`/`UF` (strings, sem ids) | o app resolve os ids via lookup por nome; a API não tem nenhum id numérico |
| `created_at` | aproximado a partir de `ano_projeto` (bulk) ou `data_inicio` (por projeto) | **com perda** — a API tem `data_inicio` **e** `data_termino` reais, só um dos dois é guardado |
| `urlized` | — | gerado pelo app, sem equivalente na API |

**Totalmente novo na API, não capturado em nenhum lugar do schema antigo:**
`acessibilidade`, `democratizacao`, `tipicidade`, `tipologia`, `etapa`,
`ficha_tecnica`, `impacto_ambiental`, `outras_fontes`, além dos arrays
embutidos `divulgacao`, `local_realizacao`, `distribuicao`, `deslocamento`,
`certidoes_negativas`.

## Diff de `entidades` (bônus, já que é a outra metade do "mesmo registro")

A tabela `entidades` antiga carrega enriquecimento calculado pelo app que a
API não tem de jeito nenhum: `logradouro`, `cep`, `email`,
`tel_res/cel/fax/com`, flags `patrocinador`/`proponente`/`empresa`,
`projetos_count/sum`, `incentivos_count/sum`, `projetos_liberados`,
`last_incentivo`, `cidade_id`. O registro de `/incentivadores` ao vivo é só
`nome, municipio, UF, responsavel, tipo_pessoa, cgccpf, total_doado` — sem
endereço/contato, e `total_doado` já chega pré-agregado pelo servidor em vez
de por projeto.

## Conclusão

O schema antigo é um subconjunto achatado e normalizado por FK de um
punhado de campos da API (com duas colunas genuinamente mortas e duas
cadeias de fallback com perda); a API ao vivo é orientada a documento,
com chaves em string, e bem mais rica em detalhe narrativo/embutido que o
código de sync atual não captura.

## Por que o ETL espalha um registro da API em várias tabelas

Não é uma escolha do `mostre.py` — é herança do schema Rails pré-existente.
O app Rails (`db/schema.rb`, `app/models/*.rb`) já existia antes da
integração com a API SALIC, com suas próprias `belongs_to`/`has_many` e
tabelas normalizadas por FK. O `mostre.py` foi escrito depois pra repopular
esse mesmo banco a partir da API, então ele precisa encaixar o JSON
"documento único" da API no schema já existente — não o contrário. Prova
disso: as 23 colunas do `INSERT INTO projetos` em `mostre.py:294-301` batem
exatamente, na mesma ordem, com as colunas de `create_table "projetos"` em
`schema.rb:222-245`.

Assim, cada pedaço do JSON da API é fatiado assim:

| pedaço do JSON da API | vira | por quê |
|---|---|---|
| campos planos do projeto (`nome`, `situacao`, `valor_*`...) | `projetos` | mapeamento direto pras colunas do Rails |
| `cgccpf` + `proponente` + `UF` embutidos | linha em `entidades`, resolvida/criada por `cgccpf` → `entidade_id` | Rails modela o proponente como registro próprio com FK; a API modela como string solta |
| `area` / `segmento` (strings) | linhas em `areas`/`segmentos`, resolvidas por nome → `area_id`/`segmento_id` | idem — Rails usa tabelas de lookup com id, a API não tem id nenhum |
| `UF` | linha em `estados` → `estado_id` | mesma lógica |
| `_embedded.captacoes` (array de doações) | uma linha em `incentivos` por par projeto+doador (agregada) + uma linha em `recibos` por doação individual | o Rails já modelava "quem doou quanto pra qual projeto" como duas tabelas separadas (resumo vs. histórico); cada item do array embutido é explodido em duas inserções |

Ou seja: o schema de destino já era normalizado em várias tabelas antes da
API existir, e `sync_projetos`/`sync_por_projeto`/`sync_incentivadores`
fazem esse encaixe (resolve-ou-cria FK) campo por campo. É por isso que
tanto campo rico da API (`objetivos`, `justificativa`,
`_embedded.divulgacao`, etc.) fica sem lugar nenhum pra ir — o schema
antigo simplesmente não tem coluna pra eles.
