# Proposal: Freelas Automation Platform MVP

## Why

Gerenciamento manual de múltiplas contas em plataformas de freelas (99freelas) é repetitivo e consome tempo. Não existe uma ferramenta open-source que centralize monitoramento de projetos, mensagens e propostas para múltiplas contas com automação de scraping.

## Scope

- MVP: Monitoramento read-only do 99freelas
- 5-20 contas simultâneas
- Scraping a cada 30 minutos via Playwright
- Dashboard React para visualização
- Resolução automática de captcha (2captcha)

## Constraints

- Rodar em VPS via Docker
- Backend FastAPI + PostgreSQL
- Frontend React + Tailwind + Vite
- Playwright com browser pool (contexts isolados)

## Non-Goals

- Envio automatizado de propostas (fase 2)
- Suporte a outras plataformas (fase 3)
- Autenticação própria do app (MVP assume ambiente controlado)
