# Portal do Cliente (self-service)

Área onde o **cliente do escritório** consulta dívidas e envia documentos, separada do login do escritório (`Usuario`).

## Autenticação

| Método | URL | Auth |
|--------|-----|------|
| POST | `/api/portal/auth/ativar` | Público — primeiro acesso |
| POST | `/api/portal/auth/login` | Público |
| POST | `/api/portal/auth/recuperar-senha` | Público |
| GET | `/api/portal/me` | JWT portal |

### Primeiro acesso (`/ativar`)

```json
{
  "cpfCnpj": "03536558000184",
  "email": "cliente@email.com",
  "senha": "senha1234",
  "confirmarSenha": "senha1234"
}
```

- CPF/CNPJ deve existir em `cliente` com status `ATIVO`
- E-mail deve ser **igual** ao cadastrado no cliente
- Senha mínima 8 caracteres
- Retorna JWT (`token`) + dados básicos do cliente

### Login

```json
{
  "cpfCnpj": "03536558000184",
  "senha": "senha1234"
}
```

JWT do portal contém claim `tipoAuth=PORTAL_CLIENTE` e `clienteId`. Validade padrão: **7 dias** (`JWT_PORTAL_EXPIRATION`).

## Dívidas e resumo

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/portal/resumo` | Saldo total, qtd dívidas abertas/vencidas |
| GET | `/api/portal/dividas?status=abertas` | Lista (`abertas` ou `todas`) |
| GET | `/api/portal/dividas/{dividaId}` | Detalhe + pagamentos |
| GET | `/api/portal/extrato` | Extrato simplificado |

## Documentos

| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/api/portal/documentos` | Multipart: `arquivo`, `tipo`, `dividaId?`, `observacao?` |
| GET | `/api/portal/documentos` | Lista paginada |
| GET | `/api/portal/documentos/{id}/arquivo` | Download |

**Tipos:** `COMPROVANTE`, `NOTA_FISCAL`, `CONTRATO`, `DECLARACAO`, `OUTRO`

**MIME permitidos:** PDF, JPEG, PNG, WebP, DOC/DOCX (configurável)

## Escritório (staff JWT)

| Método | URL |
|--------|-----|
| GET | `/api/documentos-clientes/resumo` |
| GET | `/api/clientes/{clienteId}/documentos` |
| GET | `/api/documentos-clientes?clienteId=&status=&tipo=` |
| GET | `/api/documentos-clientes/{id}` |
| GET | `/api/documentos-clientes/{id}/arquivo` |
| PATCH | `/api/documentos-clientes/{id}/status` |
| PATCH | `/api/documentos-clientes/{id}/resposta` |

### Resposta do escritório (`PATCH .../resposta`)

```json
{
  "resposta": "Recebemos o comprovante. Em análise."
}
```

- Grava `respostaEscritorio`, `respondidoEm` e `respondidoPor`
- Se status for `RECEBIDO`, muda automaticamente para `EM_ANALISE`
- O cliente vê a resposta em `GET /api/portal/documentos`

### Resumo (`GET /api/documentos-clientes/resumo`)

```json
{
  "recebidos": 3,
  "emAnalise": 1,
  "arquivados": 10
}
```

### Campos extras no DTO (staff e portal)

- `clienteId`, `clienteNome`, `clienteCodigo`
- `respostaEscritorio`, `respondidoEm`, `respondidoPorNome`

## Variáveis de ambiente (Render)

| Variável | Valor sugerido |
|----------|----------------|
| `SGI_DOCUMENTOS_STORAGE_PATH` | `/var/data/documentos-clientes` |
| `SGI_DOCUMENTOS_MAX_FILE_SIZE_BYTES` | `10485760` |
| `JWT_PORTAL_EXPIRATION` | `604800000` |
| `CORS_ALLOWED_ORIGINS` | URL do frontend + localhost |

## Segurança de dados

- Novas tabelas: `cliente_portal_credencial`, `documento_cliente`
- `ddl-auto=update` — apenas **adiciona** estrutura; não apaga dados existentes
- `sgi.seed.enabled=false` em produção
- Arquivos em disco persistente `/var/data` (mesmo volume dos boletos)

## Bloqueio de acesso

- `cliente.portalHabilitado=false` impede login/ativação
- Credencial `status=BLOQUEADO` invalida sessão
