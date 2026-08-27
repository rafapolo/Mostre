# sync por_projeto — estado e instruções

## Estado atual (2026-06-01)

| tabela | total |
|--------|-------|
| projetos | 178.210 |
| projetos com entidade | 160.302 (90%) |
| projetos sem entidade | **17.908** ← ainda pendentes |
| entidades | 137.913 |
| incentivos | 191.433 |
| recibos | 270.545 |

### Distribuição por ano (created_at)
- **Dados antigos (MySQL dump):** 2013–2016 (~149k projetos)
- **Dados novos (API sync):** 2024–2026 (~11k projetos)
- **Gap:** 2017–2023 — ainda não sincronizado

### Progresso do sync atual
- Sessão anterior parou com ~17.908 pendentes
- CF session expira a cada ~350 requests — Chrome não abre em contexto de agente
- Cada sessão processa ~5.500 projetos antes de cair

---

## Instruções para continuar

### 1. Renovar cookies manualmente (necessário toda vez que CF expira)

```bash
python3 db/mostre.py sync por_projeto
```

O Chrome abre, resolve o Cloudflare automaticamente (ou clique se pedir), e o sync inicia.
Cookies são salvos em `db/.cf_cookies.json` para reuso pelo agente.

### 2. Pedir ao agente para continuar

Após rodar manualmente e o Chrome fechar, dizer ao agente:
> "reinicia o sync por_projeto"

O agente roda em background e avisa quando parar.

### 3. Ciclo esperado

```
você roda manual (Chrome resolve CF + salva cookies)
  → agente pega e roda em background (~5k projetos)
  → CF expira, agente para limpo
  → você roda manual novamente
  → repete até 0 pendentes
```

Estimativa: ~3–4 ciclos para zerar os 17.908 restantes (~22h de CPU no total).

---

## Arquivos relevantes

- `db/mostre.py` — script principal de sync
- `db/.cf_cookies.json` — cache de cookies CF (não commitado)
- `storage/development.sqlite3` — banco SQLite
