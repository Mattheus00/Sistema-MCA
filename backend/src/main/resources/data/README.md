# Importação de clientes

Os arquivos de clientes são privados, não devem ser versionados e não entram no JAR.
Guarde-os em um diretório do filesystem e configure `sgi.import.clientes-dir`
(ou `SGI_IMPORT_CLIENTES_DIR`). O default vazio desativa a leitura. Diretório ou
arquivo ausente é ignorado, com diagnóstico em DEBUG.

- `clientes-relatorio.csv`: UTF-8, separado por vírgulas, primeira linha de
  cabeçalho `codigo,nome,celular,email,cpf_cnpj`. Código e nome são obrigatórios;
  CPF/CNPJ deve conter 11 ou 14 dígitos. Campos com vírgulas devem usar aspas.
- `clientes-emails.csv`: UTF-8, separado por ponto e vírgula, colunas de nome e
  e-mail. Cabeçalho `NOME DA EMPRESA;E-MAIL`. O importador mantém o mapeamento
  de nomes legado e só atualiza clientes encontrados.

Não coloque dados reais neste README. O relatório só é importado com o cadastro
de clientes vazio; a atualização de e-mails preserva endereços já iguais.
O marcador `.clientes-relatorio-hash` é gravado no diretório externo configurado.

`mvn spring-boot:run` continua lendo `application-local.properties` dos recursos
locais. Esse arquivo é excluído do JAR e do contexto Docker; para executar um JAR
localmente, forneça `JWT_SECRET` ou carregue uma configuração externa.
