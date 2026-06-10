# Design: Freelas Automation Platform

## Architecture

Híbrida com Worker Pool:
- 3 containers: `api` (FastAPI + Playwright), `db` (PostgreSQL), `nginx` (frontend estático + proxy)
- BrowserPool: 1 Chromium + N BrowserContexts isolados (1 por conta)
- ThreadPoolExecutor (max 5 workers) para concorrência de scraping
- APScheduler: `full_sync` a cada 15 minutos por conta ativa

## Data Models

5 entidades: Account, Project, Message, Proposal, ScrapingJob
- Account: credenciais criptografadas (Fernet), cookies de sessão
- Project/Message/Proposal: upsert por `external_id + account_id`
- ScrapingJob: log de execução com status, erro, itens raspados

## API

RESTful FastAPI:
- Accounts CRUD + sync manual
- Projects: list (cached) + scrape (live) + detail + proposals
- Messages, Proposals, Jobs: list + detail
- Dashboard stats (contadores agregados)

## Frontend

6 páginas: Dashboard, Accounts, Projects, Messages, Proposals, Jobs
- Sidebar + DataTable genérica + StatusBadge + Skeleton + Modal
- Projects page: **always live scrape** from 99freelas
- Custom hooks: useFetch, useSync

## Cache Strategy

| Context | Behavior |
|---------|----------|
| Frontend Projects | Live scrape on every load |
| Background scheduler | Scrape + cache every 15 min |
| Dashboard / Jobs | Use cached data |
| Modal proposals | Live scrape per project |

## Security

- Senhas: Fernet AES-128 (chave em `.env`)
- Cookies criptografados no banco
- Nunca loga credenciais em texto plano
- Playwright em container isolado

## Error Handling

- Retry: 3 tentativas com backoff (5s, 15s, 45s)
- Circuit breaker: 5 falhas seguidas = pausa 2h
- Timeout: 60s por page load (Playwright)
- Contexto descartado em erro para forçar re-login
- UNIQUE constraint: select + update/insert (never merge)
