# Sistema-MCA

Monorepo do **SGI** (Sistema de Gestão Integrada) — escritório de contabilidade MCA.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| [`frontend/`](frontend/) | React + TypeScript + Vite (interface web) |
| [`backend/`](backend/) | Backend Spring Boot (deploy Render) |
| [`Codigo/Backend/`](Codigo/Backend/) | Cópia legada do backend (TCC) |

## Desenvolvimento

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Documentação de integração: [`frontend/docs/COMO-INTEGRAR-FRONTEND.md`](frontend/docs/COMO-INTEGRAR-FRONTEND.md)

### Backend

Ver [`BACKEND.md`](BACKEND.md) e [`backend/docs/DEPLOY-RENDER.md`](backend/docs/DEPLOY-RENDER.md).

## Deploy

| Serviço | Root Directory | Plataforma |
|---------|----------------|------------|
| Frontend | `frontend` | [Vercel](https://vercel.com) |
| Backend | `backend` | [Render](https://render.com) |

**Vercel:** em *Project Settings → General → Root Directory*, use `frontend`.

**Variáveis (Vercel):** `VITE_API_URL` apontando para a URL do backend; `VITE_USE_MOCK=false` em produção.
