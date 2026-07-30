# Cobranças recorrentes, reajustes e taxa de balanço

## Visão geral

O SGI usa a entidade `Divida` como registro de cobrança. Para preservar o contrato atual do frontend, as cobranças recorrentes também são gravadas como dívidas, com metadados adicionais:

- `tipoCobranca`: `HONORARIO_MENSAL`, `TAXA_BALANCO`, `COBRANCA_MANUAL`, `ACORDO` ou `OUTROS`;
- `competencia`: formato `yyyy-MM`;
- `geradaAutomaticamente`;
- `origemCobranca`;
- `anoTaxaBalanco`.

A taxa de balanço é uma cobrança separada e aparece na coluna `Descrição` como:

```text
Taxa de Balanço - AAAA
```

## Novas entidades

- `ConfiguracaoCobranca`: configuração por cliente, com cobrança recorrente ativa, dia de vencimento e taxa de balanço ativa.
- `HonorarioCliente`: histórico de valores de honorários por vigência. O valor é persistido em centavos e retornado em reais.
- `AuditoriaOperacao`: registro simples de operações relevantes manuais e automáticas.

## Regras de honorário

- O valor deve ser maior que zero.
- Um cliente pode ter vários valores históricos, mas somente um valor vigente por data.
- Ao cadastrar novo valor, o valor vigente anterior é encerrado no dia anterior ao início da nova vigência.
- Reajustes não alteram cobranças já criadas.
- Reajuste em lote exige percentual maior que zero e no máximo `100%`.

## Geração mensal

Scheduler:

```properties
scheduler.cobrancas-recorrentes.cron=0 0 6 1 * *
```

Todo dia 1º às 06:00 no fuso `America/Sao_Paulo`, o sistema:

1. busca clientes ativos com cobrança recorrente habilitada;
2. localiza o honorário vigente na competência;
3. calcula o vencimento pelo dia configurado;
4. usa o último dia do mês quando o dia configurado não existe;
5. cria cobrança `HONORARIO_MENSAL`;
6. ignora duplicidades por cliente, tipo e competência;
7. registra auditoria e continua processando os demais clientes em caso de erro.

Em dezembro, a mesma rotina também tenta gerar `TAXA_BALANCO` para clientes com a opção ativa.

## Endpoints

### Configuração da cobrança

`GET /api/clientes/{clienteId}/configuracao-cobranca`

`POST /api/clientes/{clienteId}/configuracao-cobranca`

`PUT /api/clientes/{clienteId}/configuracao-cobranca`

Exemplo:

```json
{
  "cobrancaRecorrenteAtiva": true,
  "diaVencimento": 31,
  "taxaBalancoAtiva": true
}
```

### Honorários

`GET /api/clientes/{clienteId}/honorarios`

`GET /api/clientes/{clienteId}/honorarios/atual`

`POST /api/clientes/{clienteId}/honorarios`

Exemplo:

```json
{
  "valor": 800.00,
  "dataInicioVigencia": "2026-01-01",
  "observacao": "Valor inicial"
}
```

### Reajuste em lote

`POST /api/honorarios/reajustes/simular`

`POST /api/honorarios/reajustes/aplicar`

Exemplo:

```json
{
  "percentualReajuste": 8,
  "dataInicioVigencia": "2027-01-01",
  "observacao": "Reajuste anual",
  "aplicarTodos": true
}
```

Também é possível enviar `clienteIds` e `aplicarTodos=false`.

### Execução manual

`POST /api/admin/cobrancas-recorrentes/gerar`

```json
{
  "competencia": "2027-01"
}
```

`POST /api/admin/taxas-balanco/gerar`

```json
{
  "ano": 2027
}
```

## Banco de dados

O projeto usa `spring.jpa.hibernate.ddl-auto=update`; não há Flyway ou Liquibase configurado. As novas tabelas/colunas/índices são declaradas via JPA.

Para ambientes já existentes, valide se o SQLite aplicou a restrição única de `Divida`:

```text
cliente_id + tipo_cobranca + competencia
```

Mesmo sem a restrição física, o serviço valida a duplicidade antes de inserir.

## Impacto no frontend

Não há alteração obrigatória no frontend atual. As novas cobranças aparecem nas listagens existentes como dívidas, e a taxa de balanço aparece pela descrição.

Prompt sugerido caso queira criar telas administrativas no frontend:

```text
Implemente telas administrativas para configurar cobrança recorrente por cliente, cadastrar/listar histórico de honorários, simular/aplicar reajuste em lote e executar manualmente a geração de cobranças/taxa de balanço usando os endpoints documentados em backend/docs/COBRANCAS-RECORRENTES.md.
```
