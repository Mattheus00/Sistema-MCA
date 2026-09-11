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

## Próximas fases

Fases 2 a 7 ainda não iniciadas; serão executadas em ordem após validação e commit
da fase anterior.
