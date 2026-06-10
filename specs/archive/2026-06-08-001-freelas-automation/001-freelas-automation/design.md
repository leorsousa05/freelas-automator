# Design: Freelas Automation Platform MVP

## Architecture

Opção C (Híbrida com Worker Pool):
- 3 containers: `api` (FastAPI + Playwright), `db` (PostgreSQL), `nginx` (frontend estático + proxy)
- BrowserPool: 1 Chromium + N BrowserContexts isolados (1 por conta)
- ThreadPoolExecutor (max 5 workers) para concorrência de scraping
- APScheduler: `full_sync` a cada 30 minutos por conta ativa

## Data Models

5 entidades: Account, Project, Message, Proposal, ScrapingJob
- Account: credenciais criptografadas (Fernet), cookies de sessão
- Project/Message/Proposal: upsert por `external_id + account_id`
- ScrapingJob: log de execução com status, erro, itens raspados

## API

RESTful FastAPI:
- Accounts CRUD + sync manual
- Projects, Messages, Proposals, Jobs: list + detail
- Dashboard stats (contadores agregados)

## Frontend

6 páginas: Dashboard, Accounts, Projects, Messages, Proposals, Jobs
- Sidebar + DataTable genérica + StatusBadge + Skeleton
- Custom hooks: useFetch, useSync

## Security

- Senhas: Fernet AES-128 (chave em `.env`)
- Cookies criptografados no banco
- Nunca loga credenciais em texto plano
- Playwright em container isolado

## Error Handling

- Retry: 3 tentativas com backoff (5s, 15s, 45s)
- Circuit breaker: 5 falhas seguidas = pausa 2h
- Timeout: 3 min por job
- Contexto descartado em erro para forçar re-login
