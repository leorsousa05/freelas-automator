# Design Doc — Freelas Automation Platform

**Date:** 2026-06-08
**Status:** Approved
**Scope:** MVP — Monitoramento do 99freelas (read-only)

---

## 1. Overview

Sistema para automatizar o monitoramento de múltiplas contas na plataforma 99freelas. O backend faz scraping periódico via Playwright, persiste dados no PostgreSQL e expõe uma API REST consumida por um frontend React.

**Tecnologias:**
- Backend: FastAPI + Python 3.11 + Playwright + APScheduler + SQLAlchemy
- Frontend: React 18 + Tailwind CSS + Vite + React Router
- Infra: Docker Compose + PostgreSQL 15 + Nginx

---

## 2. Goals & Non-Goals

**Goals (MVP):**
- Cadastrar múltiplas contas 99freelas com login/senha
- Resolver captcha automaticamente via 2captcha
- Fazer scraping periódico (a cada 30min) de: projetos, mensagens, propostas
- Persistir todos os dados no PostgreSQL
- Exibir dashboard, projetos, mensagens, propostas e logs de execução no frontend
- Suportar 5–20 contas simultâneas

**Non-Goals (futuro):**
- Envio automatizado de propostas
- Resposta automatizada de mensagens
- Suporte a outras plataformas (Workana, Upwork, etc.)
- Notificações push/email
- Autenticação de usuários do app (MVP não tem login próprio)

---

## 3. Architecture

**Opção escolhida:** Híbrida com Worker Pool (Opção C)

### 3.1 Containers

| Container | Função | Tecnologia |
|-----------|--------|------------|
| `api` | FastAPI + APScheduler + Playwright Pool | Python 3.11, Uvicorn |
| `db` | Banco relacional | PostgreSQL 15 |
| `nginx` | Reverse proxy + static files | Nginx latest |

**Comunicação:**
- Frontend → Nginx → FastAPI → PostgreSQL
- APScheduler (no container `api`) → dispara jobs → ThreadPoolExecutor → Playwright → 99freelas → PostgreSQL

### 3.2 Playwright Pool

- Um `BrowserPool` singleton gerencia **1 instância Chromium** + N `BrowserContext`s isolados
- Cada `Account` recebe um contexto persistente (cookies, localStorage separados)
- Contextos são reusados entre scrapings — evita relogin repetido
- `ThreadPoolExecutor` com `max_workers=5` limita concorrência
- Timeout por job: 3 min. Se expirar, contexto é descartado e recriado

### 3.3 Agendamento

- APScheduler dispara `full_sync` a cada 30min por conta ativa (`is_active=true`)
- Jobs pendentes esperam na fila interna do executor
- Sync manual via endpoint `POST /api/accounts/{id}/sync`

---

## 4. Data Models

### 4.1 Account

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `username` | string | Login no 99freelas (unique) |
| `password_encrypted` | string | Fernet AES-128 |
| `session_cookies` | JSON/text | Cookies da sessão atual |
| `is_active` | bool | Se participa do scraping |
| `last_login_at` | datetime | Último login bem-sucedido |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 4.2 Project

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `account_id` | UUID | FK → Account |
| `external_id` | string | ID no 99freelas |
| `title` | string | |
| `description` | text | |
| `budget_min` | decimal | nullable |
| `budget_max` | decimal | nullable |
| `deadline` | date | nullable |
| `url` | string | Link direto |
| `category` | string | |
| `skills` | JSON | Array de strings |
| `scraped_at` | datetime | |
| `is_new` | bool | Não visto pelo usuário |

**Unique constraint:** `external_id + account_id`

### 4.3 Message

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `account_id` | UUID | FK → Account |
| `external_id` | string | ID no 99freelas |
| `sender_name` | string | |
| `sender_type` | enum | `client`, `system` |
| `content` | text | |
| `received_at` | datetime | |
| `is_read` | bool | |

### 4.4 Proposal

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `account_id` | UUID | FK → Account |
| `project_id` | UUID | FK → Project (nullable) |
| `external_id` | string | ID no 99freelas |
| `value` | decimal | Valor proposto |
| `delivery_time_days` | int | |
| `message` | text | |
| `status` | enum | `sent`, `viewed`, `accepted`, `rejected`, `expired` |
| `sent_at` | datetime | |

### 4.5 ScrapingJob

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `account_id` | UUID | FK → Account |
| `job_type` | enum | `projects`, `messages`, `proposals`, `full_sync` |
| `status` | enum | `pending`, `running`, `success`, `failed` |
| `started_at` | datetime | |
| `finished_at` | datetime | |
| `error_message` | text | nullable |
| `items_scraped` | int | |

---

## 5. API Specification

### 5.1 Accounts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/accounts` | Lista contas |
| `POST` | `/api/accounts` | Cria conta + testa login imediatamente |
| `GET` | `/api/accounts/{id}` | Detalhes |
| `PUT` | `/api/accounts/{id}` | Atualiza credenciais |
| `DELETE` | `/api/accounts/{id}` | Remove conta + limpa dados |
| `POST` | `/api/accounts/{id}/sync` | Força scraping manual |

### 5.2 Projects

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/projects` | Lista com filtros: `account_id`, `is_new`, `category`, `search` |
| `GET` | `/api/projects/{id}` | Detalhes |

### 5.3 Messages

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/messages` | Lista com filtros: `account_id`, `is_read` |
| `PATCH` | `/api/messages/{id}/read` | Marca como lida |

### 5.4 Proposals

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/proposals` | Lista com filtros: `account_id`, `status` |
| `GET` | `/api/proposals/{id}` | Detalhes |

### 5.5 Jobs

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/jobs` | Histórico paginado |
| `GET` | `/api/jobs/{id}` | Detalhes |

### 5.6 Dashboard

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/dashboard/stats` | Contadores agregados |

---

## 6. Frontend Structure

### 6.1 Páginas (React Router)

| Rota | Conteúdo |
|------|----------|
| `/` | Dashboard — cards de stats, gráfico de atividade, projetos recentes |
| `/accounts` | CRUD de contas, botão sync manual, status último scraping |
| `/projects` | DataTable com filtros, ordenação, badge "Novo", link externo |
| `/messages` | Inbox estilo email, filtros, marcar como lida |
| `/proposals` | Tabela com status colorido, valor, prazo |
| `/jobs` | Log de execução, status sucesso/falha, mensagem de erro |

### 6.2 Componentes Compartilhados

- `Sidebar` — navegação responsiva
- `DataTable` — sort, filter, pagination genérico
- `StatusBadge` — cores por status
- `Toast` — notificações
- `ConfirmModal`
- `Skeleton` — loading states

### 6.3 Hooks

- `useFetch` — fetch genérico com loading/error
- `useSync` — trigger de sync manual com polling de status

---

## 7. Playwright Worker

### 7.1 Login + Captcha Flow

```
Account criada → Worker abre contexto → navega pro login 99freelas
  → preenche username/password → detecta captcha
  → envia imagem/sitekey pra API 2captcha → aguarda token (max 60s)
  → resolve captcha no site → login bem-sucedido
  → extrai cookies → salva no Account.session_cookies
  → contexto fica vivo para reuso
```

### 7.2 Anti-Detection

- User-Agent real de Chrome
- Viewport padrão (1920x1080)
- `playwright-stealth` ou stealth launch args
- Não usa `headless=True` — usa `headless=new` com args de stealth
- Ações humanizadas: delays randômicos entre clicks, scroll suave

### 7.3 Scraping Strategy

Por conta, a cada ciclo:
1. Projetos disponíveis (listagem principal)
2. Inbox de mensagens
3. Propostas enviadas

Todos os dados são normalizados e salvos via **upsert** (`INSERT ... ON CONFLICT` por `external_id + account_id`).

---

## 8. Security

- **Senhas:** Criptografadas com Fernet (AES-128). Chave de 32 bytes via variável de ambiente `ENCRYPTION_KEY`.
- **Cookies:** Também criptografados antes de persistir no banco.
- **Logs:** Credenciais nunca logadas em texto plano. Stack traces truncados em produção.
- **Rede:** Container `api` não expõe porta do Playwright. Nginx é o único ponto de entrada.
- **App:** MVP não tem autenticação própria — assume ambiente controlado (VPS privado).

---

## 9. Error Handling & Resiliência

| Estratégia | Implementação |
|------------|---------------|
| Retry | 3 tentativas com backoff exponencial: 5s, 15s, 45s |
| Circuit Breaker | Se conta falha 5x seguidas, pausa scraping por 2h |
| Timeout | 3 min por job. Contexto descartado se expirar. |
| Isolamento | Erro em um contexto não afeta os outros |
| Logging | Tudo registrado em `ScrapingJob` com status e mensagem de erro |

---

## 10. Deployment

**Docker Compose** com 3 serviços. O container `api` instala Playwright e browsers no build.

```yaml
# Resumo da estrutura
services:
  db:       PostgreSQL 15 + volume persistente
  api:      FastAPI + Playwright (build custom)
  nginx:    Static files (frontend build) + reverse proxy /api
```

**Variáveis de ambiente obrigatórias:**
- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `TWOCAPTCHA_API_KEY`

---

## 11. Future Work

- Envio automatizado de propostas com templates
- Resposta automatizada de mensagens
- Suporte a Workana e Upwork
- Notificações (email, Telegram, webhook)
- Autenticação de usuários no app
- Migração de APScheduler para Celery + Redis (escala >50 contas)
