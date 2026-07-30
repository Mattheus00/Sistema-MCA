# Migração SQLite → PostgreSQL (produção)

## 1. Criar PostgreSQL no Render

1. Dashboard Render → **New +** → **PostgreSQL**
2. Nome: `sgi-postgres`, database: `sgi`, plano **Basic** (~US$ 7/mês)
3. Copie a **External Database URL** (`postgres://...`)

Ou aplique o `render.yaml` atualizado (já inclui o banco `sgi-postgres`).

## 2. Configurar o Web Service

No serviço **sgi-backend**:

1. **Environment** → adicione/ligue:
   - `DATABASE_URL` → link com o Postgres criado
   - `SPRING_PROFILES_ACTIVE` = `prod`
   - **Remova** `SPRING_DATASOURCE_URL=jdbc:sqlite:...` se existir
2. **Disk** → mantenha `/var/data` só para PDFs de boletos:
   - `SGI_BOLETOS_STORAGE_PATH=/var/data/boletos-temp`
3. Faça **deploy** e aguarde ficar **Live** (Hibernate cria as tabelas no Postgres)

## 3. Migrar dados do SQLite local

Na sua máquina, com o SQLite em `backend/data/sgi.db`:

```bash
cd backend
pip install psycopg2-binary
set DATABASE_URL=postgres://usuario:senha@host:5432/sgi
python scripts/migrate_sqlite_to_postgres.py
```

Use a **External Database URL** do Render (não a internal).

## 4. Conferir

- Login no sistema
- Clientes, inadimplentes, pagamentos
- `GET /api/dividas` e `/api/inadimplentes`

## Desenvolvimento local

Continua com **SQLite** (`application.properties` padrão, perfil `local`).

Para testar Postgres localmente:

```env
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=postgres://...
```

## O que mudou no código

- `PostgresDataSourceEnvironmentPostProcessor` — converte `DATABASE_URL` do Render
- `application-prod.properties` — dialect PostgreSQL
- `ClientesRelatorioImportRunner` — **não apaga mais** dívidas se o banco já tiver clientes
- Disco no Render — só para arquivos PDF, não para o banco
