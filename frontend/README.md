# SGI — Frontend

Interface web do Sistema de Gestão de Inadimplentes (Contabilidade São Judas Tadeu).
React 19 + TypeScript (strict) + Vite (rolldown-vite). O backend Spring Boot fica em `../backend`.

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev            # http://localhost:5173
```

Em desenvolvimento, chamadas para `/api` são repassadas ao backend em `http://localhost:8080`
pelo proxy do Vite (ver `vite.config.ts`), o que evita problemas de CORS quando `VITE_API_URL`
está vazio.

## Variáveis de ambiente (`VITE_*`)

| Variável        | Descrição                                                                  | Padrão                  |
| --------------- | -------------------------------------------------------------------------- | ----------------------- |
| `VITE_API_URL`  | URL base do backend, sem barra final. Vazio usa o proxy `/api` do Vite.    | `http://localhost:8080` |
| `VITE_USE_MOCK` | `true` ativa a API em memória (sem backend). Só disponível em `npm run dev`. | `false`                 |

Arquivos de exemplo: `.env.example` (local), `.env.production` (Vercel) e `.env.screenshots`.

## Scripts

| Script                 | O que faz                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento com HMR                              |
| `npm run build`        | `tsc -b` + `vite build` → `dist/`                                 |
| `npm run preview`      | Serve o `dist/` localmente                                       |
| `npm run lint`         | ESLint em todo o projeto                                         |
| `npm run format`       | Prettier (`--write`) em `src/` e `test/`                         |
| `npm run format:check` | Prettier (`--check`) — usado em CI                               |
| `npm test`             | Vitest em modo watch                                             |
| `npm run test:run`     | Vitest uma vez                                                   |
| `npm run coverage`     | Vitest com cobertura (v8)                                        |
| `npm run check`        | `lint` + `tsc --noEmit` + `vitest run` (gate completo)           |
| `npm run screenshots`  | Gera capturas das telas com Playwright (`scripts/screenshots.mjs`) |

## Estrutura de pastas

```
src/
├── App.tsx / main.tsx      # rotas e bootstrap
├── App.css, index.css      # estilos globais da área administrativa
├── styles/                 # CSS por área (login, portal)
├── components/
│   ├── pages/              # uma página por rota (Web*.tsx, Dashboard, Login…)
│   ├── dashboard/          # cards, gráficos e skeleton do dashboard
│   ├── livro-caixa/        # modais do Livro Caixa
│   ├── tarefas/            # kanban, lista, calendário e modais de tarefas
│   ├── tax-simulator/      # abas do simulador da reforma tributária
│   ├── portal/             # portal do cliente (login, dívidas, documentos)
│   └── *.tsx               # componentes compartilhados (Layout, ProtectedRoute…)
├── hooks/                  # hooks de dados (ex.: useDashboardData)
├── lib/
│   ├── api.ts              # axios, sessão, helpers de erro e de lista paginada
│   ├── apiNormalizers.ts   # conversão DTO → tipos do front
│   ├── *Api.ts             # camada de acesso por domínio (tarefas, livro caixa…)
│   ├── *Utils.ts           # regras puras por domínio
│   └── mockApi.ts          # API em memória para VITE_USE_MOCK=true
└── types/                  # tipos compartilhados (api, livroCaixa, tarefas)

test/                       # Vitest + Testing Library (espelha src/lib e src/components)
```

## Convenções

- Componentes não chamam `axios` diretamente: usam os módulos `src/lib/*Api.ts`.
- Respostas da API passam por um normalizador antes de chegar aos componentes.
- Formatação com Prettier (`printWidth: 100`); rode `npm run check` antes de abrir PR.
