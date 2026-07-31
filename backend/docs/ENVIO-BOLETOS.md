# Envio de Boletos por E-mail

## Visão geral

Fluxo assistido para upload de PDFs de boletos (exportados manualmente do Sicoob), identificação automática de clientes, conferência, correção manual e envio por e-mail com anexo.

**Frontend:** aba dedicada `Envio de boletos` em `/envio-boletos` (implementação separada).

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/lotes-envio-boletos` | multipart `arquivos` — cria lote e analisa |
| GET | `/api/lotes-envio-boletos` | histórico paginado |
| GET | `/api/lotes-envio-boletos/{loteId}` | detalhe do lote |
| GET | `/api/lotes-envio-boletos/{loteId}/resultado-envio` | enviados / erros / não enviados por cliente |
| PATCH | `.../itens/{itemId}/cliente` | correção manual |
| PATCH | `.../itens/{itemId}/confirmar` | confirma item com confiança BAIXA |
| PATCH | `.../itens/{itemId}/ignorar` | ignora item |
| PATCH | `.../itens/{itemId}/reativar` | reativa item ignorado |
| GET | `.../itens/{itemId}/arquivo` | visualiza PDF |
| POST | `.../validar` | valida bloqueios antes do envio |
| POST | `.../enviar` | envia itens prontos |
| POST | `.../cancelar` | cancela lote |
| GET | `.../relatorio.csv` | relatório CSV |

## Identificação

1. **CPF/CNPJ** no nome do arquivo → confiança ALTA
2. **Nome** normalizado (sem acentos, stopwords) → exato ALTA, aproximado MEDIA
3. Ambiguidade → BAIXA (exige confirmação ou correção manual)
4. Sem match → NAO_IDENTIFICADO

## Variáveis de ambiente

```env
SGI_EMAIL_ENABLED=false
SGI_BOLETOS_STORAGE_PATH=./data/boletos-temp
SGI_BOLETOS_MAX_FILE_SIZE_BYTES=10485760
SGI_BOLETOS_MAX_FILES_PER_LOTE=150
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
```

Com `SGI_EMAIL_ENABLED=false`, o envio é **simulado** (registrado com `simulado=true`).

## Modo desenvolvimento

1. Configure SMTP em `/api/email-config` ou variáveis `MAIL_*`
2. Use `SGI_EMAIL_ENABLED=false` para testar fluxo sem e-mail real
3. Teste upload via Swagger ou curl multipart

## Limitações v1

- Identificação apenas pelo **nome do arquivo** (sem OCR do PDF)
- Envio **síncrono** por requisição
- Armazenamento local em disco (`sgi.boletos.storage-path`)
- Sem integração Sicoob/Zoho API
- Hibernate `ddl-auto=update` (recomenda-se Flyway em produção)

## Auditoria

Eventos: `LOTE_BOLETO_CRIADO`, `BOLETO_CLIENTE_IDENTIFICADO`, `BOLETO_CLIENTE_ALTERADO_MANUAL`, `BOLETO_ENVIADO`, `BOLETO_ENVIO_ERRO`, etc.
