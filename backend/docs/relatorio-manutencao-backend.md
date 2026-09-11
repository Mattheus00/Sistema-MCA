# Relatório de manutenção do backend

Repositório confirmado: `Mattheus00/Sistema-MCA`; raiz `C:\Users\Matheus\TCC`.
Escopo: `backend/` e regras de ignore correspondentes na raiz. Frontend preservado.

## Fase 1 — Dados e credenciais

### Alterações

- CSVs `clientes-relatorio.csv` e `clientes-emails.csv` removidos do índice Git,
  preservados no filesystem e ignorados após a regra `!backend/**` da raiz.
- Os dois importadores leem `sgi.import.clientes-dir`; vazio, diretório inexistente
  ou arquivo ausente resulta em no-op com DEBUG. O marcador acompanha o diretório
  externo. Formatos descritos em `src/main/resources/data/README.md` sem dados reais.
- CSVs e `application-local.properties` excluídos dos recursos Maven e do contexto
  Docker; `spring-boot:run` mantém acesso aos recursos locais de desenvolvimento.
- Seeder consulta cada login individualmente e cria somente contas ausentes com
  os dados originais. Nenhuma conta existente tem login, senha, nome, perfil ou
  status alterado. Configuração SMTP existente é preservada.
- Removidos resets de senha e migrações de login. Removida a limpeza automática de
  serviços para respeitar a restrição de não apagar dados.
- Base usa `jwt.secret=${JWT_SECRET}` e `sicoob.client-id=${SICOOB_CLIENT_ID:}`.
  Valores anteriores preservados exclusivamente na configuração local ignorada.
- JWT rejeita segredos com menos de 32 bytes UTF-8 em `@PostConstruct`, sem padding.
  O validador de produção mantém a rejeição do segredo de desenvolvimento usando
  sua impressão SHA-256, sem manter outra cópia do segredo literal.
- Corrigido `ControllerMvcTestSupport`: mock de `StaffAccessService`, necessário
  para montar o contexto MVC atual. A suíte inicial tinha 149 testes, com 20 erros
  de contexto anteriores ao patch e nenhuma falha de asserção.

### Validação

- `mvn -q -DskipTests compile`: PASSOU (também executado com log em
  `target/phase1-clean-compile.log`, após `mvn -q clean compile -DskipTests`).
- `mvn -q test -l target/phase1-test.log`: PASSOU, 190 testes, zero falhas,
  zero erros, zero ignorados. Os relatórios Surefire estão em
  `target/surefire-reports/` (incluem as suítes aninhadas). A compilação limpa
  eliminou dois relatórios/classes antigos sem fonte correspondente.
- 41 execuções de regressão novas: importação externa (11), seeder (7), JWT (14),
  validador de produção (9). Cobrem arquivos ausentes, importação sintética,
  idempotência, preservação de contas e rejeição de chaves curtas/erradas.
- `mvn -q -DskipTests package -l target/phase1-package.log`: PASSOU.
  Inspeção por `zipfile` confirmou ausência dos CSVs e da configuração local no
  JAR, inclusive com recursos antigos presentes em `target/classes`.
- Checagem do fingerprint SHA-256 contra a configuração local: PASSOU sem
  imprimir os valores. Testes unitários usam somente segredos sintéticos.
- `git diff --check`: PASSOU. `git check-ignore --no-index` confirmou os dois
  CSVs e a configuração local ignorados. Os CSVs continuam no filesystem.
- Revisão independente somente leitura: nenhum bypass ou regressão concreta
  identificado no candidato da Fase 1.
- Nenhuma aplicação foi iniciada contra SQLite real ou Render; nenhum dado de
  produção foi acessado. Nenhuma alteração em `frontend/`.

O caminho original classpath → importação foi substituído por filesystem
explicitamente configurado, e a inspeção do JAR demonstrou a exclusão. Chaves
curtas impedem a criação do bean Spring; tokens de escritório e portal mantêm
suas claims e separação. Os testes do seeder demonstram preservação integral de
contas já existentes e manutenção dos dados originais nas contas novas.

### Pendências de infraestrutura

- Ambos os `render.yaml` já geram `JWT_SECRET`. Nenhum declara `SICOOB_CLIENT_ID`;
  configurar essa variável no dashboard do Render para a integração real.
- O histórico Git ainda contém os CSVs. Se o repositório for público, é necessário
  planejar reescrita com `git filter-repo` e coordenar os clones existentes.
  Nenhuma reescrita de histórico foi executada.
- Dados legados em `clientes-importar.txt`, scripts auxiliares e mapeamentos de
  nomes preexistentes não foram removidos nesta fase, que trata os dois CSVs
  indicados. A exclusão desses CSVs não equivale a expurgar todos os dados legados.

### Decisões

- Preservada a habilitação atual do seeder por perfil; esta fase não o desliga.
- Não executar aplicação contra banco real nem alterar dados de produção.
- Remover exclusão automática de serviços antigos junto aos resets: preservar
  catálogos existentes é consistente com a restrição geral de não apagar dados.
- CSVs ficam no disco local e fora do Git/JAR; o diretório de importação precisa
  ser explicitamente configurado para permitir leitura.

## Fase 2 — Autenticação e tratamento de erros

### Alterações

- Novos endpoints públicos `POST /api/auth/recuperar-senha/solicitar` (`login`) e
  `POST /api/auth/recuperar-senha/redefinir` (`token`, `novaSenha`, `confirmarSenha`).
  A solicitação válida retorna HTTP 200 com mensagem neutra, independentemente
  de login existente, e-mail ausente ou indisponibilidade do SMTP.
- Tokens gerados com `SecureRandom` (32 bytes), codificados como Base64 URL-safe;
  apenas SHA-256 é persistido em `token_recuperacao_senha`. Validade de 30 minutos.
  Um UPDATE condicional faz o consumo único no banco, na mesma transação da
  alteração da senha; token usado, expirado, inexistente ou consumido em corrida
  devolve a mesma mensagem de erro. O link usa `sgi.frontend-url`.
- `Usuario.email` é opcional. O campo `CadastroUsuarioDTO.email` já existia e
  agora é persistido nos cadastros, inclusive no público. Nenhuma conta real
  foi atualizada ou recebeu e-mail inventado.
- Os dois endpoints legados continuam disponíveis somente com
  `sgi.auth.password-recovery-enabled=true`. Default da base e de produção:
  false; local: true. Marcados como deprecated no Java e no OpenAPI.
- `GlobalExceptionHandler` traduz erros de status Spring, autenticação,
  autorização, JSON inválido, parâmetros ausentes, recursos inexistentes,
  métodos não suportados e Bean Validation para `ErrorResponse` com status
  correto. Enums são descritos a partir do tipo real do parâmetro.
- Falhas genéricas e de banco recebem UUID de erro na resposta; detalhes e stack
  trace ficam no log ERROR. Removida a detecção por textos internos do Postgres.
- `AccessDeniedBusinessException` substitui as exceções HTTP dos serviços de
  acesso, usuário e tarefa. Os filtros JWT, rate limit e interceptor usam
  `ObjectMapper` + `ErrorResponse`; Security também padroniza seu 401/403.
- `@Valid` aplicado nos sete corpos indicados. Cadastro/PUT de cliente exigem
  nome e CPF/CNPJ pelo grupo `Completo`; PATCH valida os campos enviados sem
  exigir os ausentes. Taxas/desconto negativos, ano fora de faixa, itemId nulo
  e webhook em branco são rejeitados. Corpos opcionais e taxas zero continuam
  aceitos conforme o comportamento existente.

### Arquivos principais

- Autenticação: `AuthService`, `AuthController`, `Usuario`, `UsuarioService`,
  `CadastroUsuarioDTO`, `TokenRecuperacaoSenha`, seu repository e os dois DTOs
  novos de recuperação; `application.properties` e configuração local ignorada.
- Erros/acesso: `GlobalExceptionHandler`, `AccessDeniedBusinessException`,
  `ApiErrorWriter`, `SecurityConfig`, `WebMvcConfig`, os dois filtros JWT,
  `RateLimitFilter`, `StaffAccessInterceptor`, `StaffAccessService`,
  `EnvioBoletoAccessService` e `TarefaService`.
- Validação: controllers `Cliente`, `JurosConfig`, `Inadimplencia`,
  `CobrancaRecorrenteAdmin`, `LoteEnvioBoleto`, `SicoobWebhook` e DTOs associados.
- Testes novos: `AuthServiceTest`, `AuthRecoveryMvcTest`,
  `GlobalExceptionHandlerMvcTest`, `FilterErrorsTest`,
  `ClienteValidationMvcTest`, `TokenRecuperacaoSenhaRepositoryTest`.
  Testes de serviços existentes atualizados para a exceção de domínio;
  `DataSeederTest` acompanha o novo campo opcional no construtor da entidade.

### Validação

- Resultado: `fixed` para o escopo solicitado nesta fase.
- `mvn -q -DskipTests package -l target/phase2-package.log`: PASSOU. JAR
  atualizado com a entidade de recuperação, mantendo as exclusões da Fase 1.
- `mvn -q -DskipTests compile -l target/phase2-compile.log`: PASSOU.
- `mvn -q test -l target/phase2-test.log`: PASSOU — 236 testes,
  zero falhas, zero erros e zero ignorados.
- `git diff --check`: PASSOU; frontend e configuração local fora do diff.
- Regressões demonstradas: token inexistente/expirado/usado/concorrente não
  altera a senha; confirmação inválida não consome token; respostas de recuperação
  não distinguem login ausente, sem e-mail ou SMTP indisponível. Rota inexistente
  retorna 404; erros internos não expõem detalhes e mantêm código rastreável.
- Testes focados confirmaram consumo único/expiração no SQL real em SQLite
  em memória, incluindo confirmação da URL JDBC e ausência de arquivo de banco.
  O harness inicial falhou por incompatibilidade do post-processor legado com
  `:memory:` no Windows; a configuração específica do Hikari resolveu o teste
  sem alterar o código de produção ou acessar bancos reais.
- Revisão de compatibilidade em passe separado: rotas públicas permanecem
  utilizáveis com JWT inválido antigo no cabeçalho; rotas protegidas recebem
  401 via entry point. PATCH parcial e campos/corpos opcionais preservados.
- A delegação de revisão ficou indisponível por limite de uso da conta; o passe
  de revisão foi executado localmente. Nenhuma revisão paralela é reivindicada.

### Pendências de frontend

- Migrar o fluxo legado para os dois endpoints novos e a página
  `/redefinir-senha?token=...`; nenhum arquivo do frontend foi alterado.
- O campo de cadastro `email` mantém seu nome. Usuários antigos sem e-mail
  precisam cadastrar um endereço por processo administrativo autorizado antes
  de receber links; a fase não inventa nem altera dados de contas existentes.
- Nenhuma rota ou campo existente foi renomeado; os códigos de sucesso foram
  preservados. O fluxo antigo fica limitado ao ambiente local durante a migração.

### Pendências de infraestrutura

- Configurar `SGI_FRONTEND_URL` para a URL real do frontend no Render e manter
  SMTP configurado. O default local é `http://localhost:5173`.
- Esta fase adiciona a coluna nullable `usuario.email` e a tabela de tokens
  através do mapeamento JPA atual. Nenhuma migração ou SQL foi executado no
  Render. A baseline Flyway dessas estruturas pertence à Fase 4.
- PostgreSQL não foi exercitado nesta fase; a Fase 4 inclui seus testes dedicados.

### Decisões

- Reaproveitar o e-mail opcional já previsto no cadastro, sem exigir valor novo
  para contas existentes nem expor o e-mail em respostas públicas de recuperação.
- Manter as regras atuais de senha (4 a 255 caracteres) e mensagens em português.
- Manter opcionais nos corpos que já tinham defaults de negócio; adicionar
  validação não deve converter PATCH em substituição integral.
- Não enviar mensagens reais durante a verificação: `EmailGateway` foi mockado.
- Concluir somente a Fase 2 neste ciclo, conforme a solicitação mais recente.

## Fase 3 — Autorização e endurecimento

### Alterações

- `@EnableMethodSecurity` em `SecurityConfig` e `@PreAuthorize` nos controllers de
  staff, reproduzindo a whitelist atual de `StaffAccessService` (`StaffAuth.STAFF`
  vs `StaffAuth.FINANCEIRO`). `StaffAccessInterceptor` permanece como camada
  redundante. Prefixos de `/api/pagamentos`, `/api/dividas` e `/api/inadimplentes`
  passaram a `equals || startsWith(path + "/")`.
- `ROLE_*` do JWT passa a ser consultado pelo method security. Controllers sem
  `Authentication` (e-mail, Sicoob, cobrança recorrente admin, etc.) ficam
  restritos a `PROPRIETARIA`/`RESPONSAVEL_FINANCEIRO`, salvo os GET já liberados
  na whitelist (juros, serviços, honorários).
- `RateLimitFilter` usa `request.getRemoteAddr()` (com
  `server.forward-headers-strategy=framework`), limpa janelas vencidas e lê
  `sgi.rate-limit.requests-per-minute` (default 20). `X-Forwarded-For` não
  contorna o limite.
- Webhook Sicoob: com `sicoob.mock=false` e segredo vazio, responde 401.
  `ProdStartupValidator` registra ERROR no boot. Em mock o comportamento anterior
  permanece.
- Os quatro importadores só sobem com `sgi.import.enabled=true` (default false).
  Removidos `deleteAll()` e o arquivo-marcador; o relatório é idempotente por
  `codigo`.
- Logout implementa blacklist mínima (`token_revogado` com `jti` + expiração),
  checada em `JwtAuthenticationFilter`. Tokens antigos sem `jti` continuam
  no-op no servidor; o cliente descarta o token.
- `spring.jpa.open-in-view=false` na base e em produção. Sem
  `LazyInitializationException` na suíte (não há `@SpringBootTest` de fatia web
  com sessão aberta). N+1 fica para a Fase 4.
- `TarefaService.resolverResponsavelCriacao`: gestor com `responsavelId` nulo
  assume o próprio solicitante. Id preenchido continua validando usuário ativo.

### Arquivos principais

- Segurança: `SecurityConfig`, `StaffAuth`, controllers de staff, `StaffAccessService`,
  `JwtAuthenticationFilter`, `JwtTokenProvider`, `AuthController`, `AuthService`,
  `TokenRevogado` / `TokenRevogadoRepository`, `RateLimitFilter`.
- Sicoob/importação: `SicoobWebhookService`, `ProdStartupValidator`, os quatro
  `*ImportRunner`, `application.properties` / `application-prod.properties`.
- Tarefas: `TarefaService`.
- Testes: `StaffAuthorizationMvcTest`, `FilterErrorsTest`, `AuthServiceTest`,
  `TarefaServiceTest`, `SicoobWebhookServiceTest`, `ClientesImportacaoExternaTest`,
  `ProdStartupValidatorTest`.

### Validação

- Resultado: `fixed` para o escopo solicitado nesta fase.
- `mvn -q test -l target/phase3-test.log`: PASSOU — 251 testes, zero falhas,
  zero erros e zero ignorados. Inclui `StaffAuthorizationMvcTest` com
  `@WithMockUser(roles = "FUNCIONARIO")` (200 em GET de juros, 403 em PUT).
- `git diff --check`: PASSOU; frontend e configuração local fora do diff.
- Decisão de logout: blacklist de `jti` (não apenas doc client-side).
  Tokens emitidos antes desta fase não têm `jti`; o logout servidor é no-op
  e o cliente continua descartando o token.

### Decisões

- Method security espelha a whitelist atual; não amplia nem restringe acesso.
- Interceptor permanece nesta fase (defesa em profundidade).
- Sem dependência nova para expiração do rate limit (mapa + limpeza periódica).
- Frontend: logout continua HTTP 200; criação de tarefa com `responsavelId`
  omitido passa a funcionar no backend. Nenhum prompt de frontend necessário.

## Fase 4 — Persistência: Flyway e queries

### Alterações

- Flyway só no PostgreSQL (`application-prod.properties`): `enabled=true`,
  `locations=classpath:db/migration/postgresql`, `baseline-on-migrate=true`,
  `baseline-version=1`. SQLite local permanece com `ddl-auto=update` e
  `spring.flyway.enabled=false`. Produção passa a `ddl-auto=validate`.
- `V1__baseline.sql` espelha o schema atual (clientes, dívidas, portal, boletos,
  livro caixa, tarefas e recuperação de senha). `V2__token_revogado.sql` cria a
  blacklist JWT da Fase 3, ausente no banco do Render no momento do baseline.
- Removido `PostgresPortalSchemaBootstrap`. As 8 `*Migration` SQLite foram
  mantidas para `sgi.db` antigo; a detecção de dialeto fecha a `Connection` em
  try-with-resources (`SqliteSchemaSupport`). Podem sair quando todos recriarem
  o SQLite local.
- `ClienteRepository.buscar` virou `ClienteSpecs` + `JpaSpecificationExecutor`
  (evita `:param IS NULL OR` no Postgres). `HonorarioClienteRepository` usa
  `IS NULL OR` em coluna, não em parâmetro — permanece. Removido
  `setStatusCanceladaNative`; `setStatusDivida` cobre os dois bancos.
- N+1: `@EntityGraph`/`JOIN FETCH` em dívidas (`cliente`), pagamentos (`divida`)
  e listagem do Livro Caixa (`categoria`, `cliente`, `conta`). Relatórios de
  pagamento/efetividade usam `SUM`/`COUNT` no repositório. Juros de mora do
  dashboard continuam em memória (dependem de `JurosConfig` e dias de atraso).
- SQL verbose saiu da base (`show-sql=false`). `DEBUG`/`TRACE` do Hibernate
  ficam só no perfil local (`application-local.properties`).
- Testcontainers (`postgresql` + `junit-jupiter`) atrás de
  `-Dsgi.testcontainers=true`. Sem a flag a suíte local não sobe Docker.

### Deploy no Render (banco existente — não recria dados)

Auto-deploy continua desligado. O Postgres de produção **não** deve receber
`ddl-auto=update`. Primeiro boot com este código:

1. Confirmar `SPRING_PROFILES_ACTIVE=prod` e `DATABASE_URL` inalterados.
2. Publicar o backend. No boot o Flyway encontra schema populado **sem**
   `flyway_schema_history`, registra `V1` como **BASELINE** (não executa o SQL
   da V1) e aplica só a **V2** (`CREATE TABLE token_revogado`).
3. O Hibernate valida o mapeamento contra as tabelas já existentes + V2.
   Se `validate` falhar, **não** voltar `ddl-auto=update`; corrigir mapping ou
   uma V3 estritamente aditiva.
4. Conferir histórico (MCP `query_render_postgres` ou `psql`):

```sql
SELECT installed_rank, version, description, type, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

Esperado: `1` / `<< Flyway Baseline >>` / `BASELINE`; `2` / `token revogado` /
`SUCCESS`. Conferir `to_regclass('token_revogado')` e contagens de `cliente` e
`usuario` iguais às de antes do deploy.

5. Instância **vazia** (não é o caso do Render): Flyway executa V1 e V2 e
   o `validate` exige que o DDL bata com as entidades.

### Validação

- Docker **não está disponível** neste ambiente (`docker` ausente no PATH).
  Os ITs Postgres (`PostgresRepositoryIT`, `PostgresFlywaySchemaIT`) ficam
  ignorados sem `-Dsgi.testcontainers=true` e sem daemon Docker. Rodar depois
  com Docker: `mvn test -Dsgi.testcontainers=true`.
- Resultado: `mvn -q test -l target/phase4-test.log` PASSOU — **251 testes**,
  zero falhas, zero erros, zero ignorados (mesma suíte da Fase 3). Os ITs
  Postgres compilam, mas a condição de sistema os exclui da execução.

### Decisões

- Baseline V1 não altera o banco populado; a única DDL nova em produção é V2.
- Migrações SQLite continuam só no perfil local até recriação unânime de
  `data/sgi.db`.
- Testcontainers opt-in para não quebrar `mvn test` sem Docker.

## Próximas fases

Fases 5 a 7 ainda não iniciadas.
