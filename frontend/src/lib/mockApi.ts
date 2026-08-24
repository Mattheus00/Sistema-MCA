import type {
  Cliente,
  Inadimplencia,
  ResumoRelatorio,
  ResumoFinanceiro,
  RankingDevedorItem,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  PagamentosRecebidosRelatorio,
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
  PerfilUsuario,
  UsuarioAtivo,
  UsuarioPendente,
  CobrancaSicoob,
  SicoobStatus,
  PagamentoInadimplencia,
  LoteEnvioBoleto,
  ItemEnvioBoleto,
  LoteEnvioBoletoResumo,
  ResultadoEnvioItem,
  ResultadoEnvioLote,
  PortalDocumento,
  TipoDocumentoCliente,
  DocumentoCliente,
  ResumoDocumentosClientes,
} from "@/types/api";

function idItemEnvioBoleto(item: ItemEnvioBoleto): string {
  return item.envioBoletoId || item.itemId;
}

const store = {
  clientes: [] as Cliente[],
  inadimplentes: [] as Inadimplencia[],
  cobrancasSicoob: [] as CobrancaSicoob[],
  pagamentos: [] as PagamentoInadimplencia[],
  usuarios: [
    {
      usuarioId: "u-proprietaria",
      login: "proprietaria",
      nome: "Usuária Proprietária",
      telefone: "(11) 99999-0001",
      perfil: "PROPRIETARIA" as PerfilUsuario,
      statusUsuario: "ATIVO",
      ultimoAcesso: null as string | null,
      criadoEm: "2026-01-01T09:00:00",
      senha: "123456",
    },
    {
      usuarioId: "u-financeiro",
      login: "financeiro",
      nome: "Responsável Financeiro",
      telefone: "(11) 98888-0002",
      perfil: "RESPONSAVEL_FINANCEIRO" as PerfilUsuario,
      statusUsuario: "ATIVO",
      ultimoAcesso: null as string | null,
      criadoEm: "2026-01-02T09:00:00",
      senha: "123456",
    },
    {
      usuarioId: "u-funcionario",
      login: "funcionario",
      nome: "Usuário Funcionário",
      telefone: "(11) 97777-0003",
      perfil: "FUNCIONARIO" as PerfilUsuario,
      statusUsuario: "ATIVO",
      ultimoAcesso: null as string | null,
      criadoEm: "2026-01-03T09:00:00",
      senha: "123456",
    },
  ],
  lotesEnvioBoletos: [] as LoteEnvioBoleto[],
  portalContas: [] as Array<{ cpfCnpj: string; email: string; senha: string; clienteId: string; nome: string }>,
  portalDocumentos: [] as Array<PortalDocumento & { clienteId: string }>,
  documentosClientes: [] as DocumentoCliente[],
};

let nextDocumentoStaffId = 1;

let nextLoteId = 1;
let nextItemId = 1;

function buildResumoLote(itens: ItemEnvioBoleto[]) {
  const pronto = (i: ItemEnvioBoleto) => {
    const s = String(i.status).toUpperCase();
    return s === "PRONTO_PARA_ENVIO" || s === "PRONTO" || s === "BAIXA";
  };
  return {
    semEmail: itens.filter((i) => i.clienteNome?.trim() && !i.emailDestinatario?.trim()).length,
    prontosParaEnvio: itens.filter((i) => pronto(i) && !!i.emailDestinatario?.trim()).length,
    ignorados: itens.filter((i) => i.status === "IGNORADO").length,
    enviados: itens.filter((i) => i.status === "ENVIADO").length,
    erros: itens.filter((i) => i.status === "ERRO").length,
    duplicados: itens.filter((i) => i.status === "DUPLICADO").length,
    bloqueados: itens.filter((i) => i.bloqueado || i.status === "BLOQUEADO").length,
  };
}

function validarLoteMock(lote: LoteEnvioBoleto) {
  const bloqueios = (lote.itens ?? [])
    .filter((i) => {
      const s = String(i.status).toUpperCase();
      if (s === "PRONTO_PARA_ENVIO" || s === "ENVIADO" || s === "IGNORADO") return false;
      if (!i.emailDestinatario?.trim() && s === "AGUARDANDO_CORRECAO") return true;
      return i.bloqueado || s === "BLOQUEADO" || s === "AGUARDANDO_CORRECAO" || s === "NAO_IDENTIFICADO" || s === "PENDENTE";
    })
    .map((i) => ({
      itemId: idItemEnvioBoleto(i),
      motivo: !i.emailDestinatario?.trim() && String(i.status).toUpperCase() === "AGUARDANDO_CORRECAO"
        ? "Sem e-mail"
        : i.motivoBloqueio ?? "Item bloqueado",
    }));
  const prontos = (lote.itens ?? []).filter((i) => String(i.status).toUpperCase() === "PRONTO_PARA_ENVIO");
  return {
    podeEnviar: prontos.length > 0,
    bloqueios,
  };
}

function loteToResumo(lote: LoteEnvioBoleto): LoteEnvioBoletoResumo {
  const resumo = lote.resumo ?? buildResumoLote(lote.itens ?? []);
  return {
    loteId: lote.loteId,
    status: lote.status,
    criadoEm: lote.criadoEm,
    enviadoEm: lote.enviadoEm,
    criadoPor: lote.criadoPor ?? "Usuário mock",
    totalItens: lote.quantidadeTotal ?? (lote.itens ?? []).length,
    enviados: resumo.enviados,
    erros: resumo.erros,
  };
}

function itemParaResultadoEnvio(item: ItemEnvioBoleto): ResultadoEnvioItem {
  const extra = item as ItemEnvioBoleto & { reenvio?: boolean; enviadoEm?: string };
  return {
    envioBoletoId: idItemEnvioBoleto(item),
    clienteId: item.clienteId,
    clienteNome: item.clienteNome,
    emailDestinatario: item.emailDestinatario,
    nomeArquivoOriginal: item.nomeArquivoOriginal,
    status: item.status,
    simulado: item.simulado,
    reenvio: extra.reenvio,
    mensagemErro: item.erro ?? null,
    dataEnvio: extra.enviadoEm,
  };
}

function buildResultadoEnvioLote(lote: LoteEnvioBoleto): ResultadoEnvioLote {
  const itens = lote.itens ?? [];
  const enviados: ResultadoEnvioItem[] = [];
  const comErro: ResultadoEnvioItem[] = [];
  const naoEnviados: ResultadoEnvioItem[] = [];
  for (const item of itens) {
    const mapped = itemParaResultadoEnvio(item);
    const status = String(item.status ?? "").toUpperCase();
    if (status === "ENVIADO") enviados.push(mapped);
    else if (status === "ERRO") comErro.push(mapped);
    else naoEnviados.push(mapped);
  }
  const resumo = lote.resumo ?? buildResumoLote(itens);
  const enviadosCount = resumo.enviados ?? 0;
  const errosCount = resumo.erros ?? 0;
  return {
    loteId: lote.loteId,
    status: lote.status,
    criadoEm: lote.criadoEm,
    dataFinalizacao: lote.enviadoEm,
    quantidadeTotal: lote.quantidadeTotal ?? itens.length,
    quantidadeEnviada: enviadosCount,
    quantidadeComErro: errosCount,
    quantidadeNaoEnviada: Math.max(0, itens.length - enviadosCount - errosCount),
    enviados,
    comErro,
    naoEnviados,
  };
}

function analisarArquivoMock(nomeArquivoOriginal: string, idx: number): ItemEnvioBoleto {
  const cliente = store.clientes[idx % Math.max(store.clientes.length, 1)];
  const semEmail = nomeArquivoOriginal.toLowerCase().includes("sem-email");
  const duplicado = nomeArquivoOriginal.toLowerCase().includes("duplicado");
  const bloqueado = nomeArquivoOriginal.toLowerCase().includes("bloqueado");
  const generico = nomeArquivoOriginal.toLowerCase() === "boleto.pdf";
  const envioBoletoId = `item-mock-${nextItemId++}`;
  let status: ItemEnvioBoleto["status"] = "PRONTO_PARA_ENVIO";
  let metodoIdentificacao: ItemEnvioBoleto["metodoIdentificacao"] = "NOME_EXATO";
  let confiancaIdentificacao: ItemEnvioBoleto["confiancaIdentificacao"] = "ALTA";

  if (generico || bloqueado) {
    status = "NAO_IDENTIFICADO";
    metodoIdentificacao = "NAO_IDENTIFICADO";
    confiancaIdentificacao = "BAIXA";
  } else if (duplicado) {
    status = "DUPLICADO";
    confiancaIdentificacao = "MEDIA";
  } else if (!cliente) {
    status = "NAO_IDENTIFICADO";
    metodoIdentificacao = "NAO_IDENTIFICADO";
    confiancaIdentificacao = "BAIXA";
  } else if (semEmail) {
    status = "AGUARDANDO_CORRECAO";
  }

  const matchCodigo = nomeArquivoOriginal.match(/^(\d+)\s/);
  if (matchCodigo) metodoIdentificacao = "CODIGO_CLIENTE";

  return {
    envioBoletoId,
    itemId: envioBoletoId,
    nomeArquivoOriginal,
    tamanhoBytes: 120_000 + idx * 1000,
    clienteId: generico || bloqueado ? undefined : cliente?.id,
    clienteNome: generico || bloqueado ? undefined : cliente?.nome,
    documentoMascarado: cliente?.cpf ? `***.***.${cliente.cpf.slice(-6)}` : undefined,
    emailDestinatario: semEmail || generico || bloqueado ? "" : cliente?.email,
    metodoIdentificacao,
    confiancaIdentificacao,
    status,
    bloqueado: bloqueado || semEmail,
    motivoBloqueio: bloqueado ? "Cliente não encontrado no cadastro" : semEmail ? "Cliente sem e-mail" : undefined,
    simulado: true,
  };
}


let nextId = 1;

function seedScreenshotDemoData() {
  if (import.meta.env.MODE !== "screenshots") return;
  if (store.clientes.length > 0) return;

  nextId = 10;
  store.clientes.push(
    {
      id: "1",
      codigo: "12",
      nome: "Comércio Silva Ltda",
      email: "contato@silvasupermercado.com.br",
      cpf: "12.345.678/0001-90",
      telefone: "(31) 3333-1000",
      celular: "(31) 98888-1234",
      situacao: "Inadimplente",
    },
    {
      id: "2",
      codigo: "28",
      nome: "Ana Paula Ferreira",
      email: "ana.ferreira@email.com",
      cpf: "123.456.789-00",
      celular: "(31) 97777-5566",
      situacao: "Ativo",
    },
    {
      id: "3",
      codigo: "35",
      nome: "Tech Solutions ME",
      email: "financeiro@techsolutions.com",
      cpf: "98.765.432/0001-10",
      celular: "(31) 96666-7788",
      situacao: "Inadimplente",
    }
  );

  const venc1 = "2025-11-15";
  const venc2 = "2025-12-01";
  const venc3 = "2026-01-10";
  store.inadimplentes.push(
    {
      id: "101",
      clienteId: "1",
      valor: 2850,
      valorOriginal: 2500,
      juros: 350,
      vencimento: venc1,
      descricao: "Honorários contábeis — out/2025",
      status: "EmAberto",
    },
    {
      id: "102",
      clienteId: "1",
      valor: 1200,
      valorOriginal: 1200,
      vencimento: venc2,
      descricao: "Declaração de IRPJ",
      status: "EmAberto",
    },
    {
      id: "103",
      clienteId: "3",
      valor: 980,
      valorOriginal: 800,
      juros: 180,
      vencimento: venc3,
      descricao: "Consultoria tributária",
      status: "EmAberto",
    },
    {
      id: "104",
      clienteId: "2",
      valor: 450,
      valorOriginal: 450,
      vencimento: "2025-10-05",
      descricao: "Honorários mensais",
      status: "Pago",
      updatedAt: "2025-10-08T14:00:00",
    }
  );

  store.usuarios.push({
    usuarioId: "u-pendente",
    login: "novo.usuario",
    nome: "Carlos Mendes",
    telefone: "(31) 95555-4433",
    perfil: "RESPONSAVEL_FINANCEIRO",
    statusUsuario: "PENDENTE_APROVACAO",
    ultimoAcesso: null,
    criadoEm: "2026-02-20T10:00:00",
    senha: "123456",
  });
}

let nextPortalDocId = 1;

function readPortalToken(): string | null {
  return readAuthItem("sgi_portal_token");
}

function getPortalSessao() {
  const token = readPortalToken();
  if (!token?.startsWith("portal-mock-")) return null;
  const clienteId = token.replace("portal-mock-", "");
  const cliente = getCliente(clienteId);
  if (!cliente?.id) return null;
  return { clienteId: cliente.id, nome: cliente.nome };
}

function dividasAbertasCliente(clienteId: string) {
  return store.inadimplentes.filter((d) => d.clienteId === clienteId && String(d.status ?? "EmAberto").toLowerCase() !== "pago");
}

function mapDividaPortal(d: Inadimplencia) {
  const atraso = diasAtraso(d.vencimento);
  return {
    id: String(d.id),
    protocolo: protocolo(d.id ?? "0", d.vencimento),
    descricao: d.descricao,
    vencimento: d.vencimento,
    valorDevedor: d.valor,
    valor: d.valor,
    status: d.status ?? "EmAberto",
    diasAtraso: atraso,
  };
}

function seedPortalMockData() {
  if (import.meta.env.VITE_USE_MOCK !== "true" && import.meta.env.VITE_USE_MOCK !== "1") return;
  if (store.portalContas.length > 0) return;
  if (store.clientes.length === 0) {
    store.clientes.push({
      id: "portal-demo",
      nome: "Cliente Portal Demo",
      email: "cliente@demo.com",
      cpf: "529.982.247-25",
      situacao: "Inadimplente",
    });
    store.inadimplentes.push(
      {
        id: "portal-d1",
        clienteId: "portal-demo",
        valor: 1500,
        valorOriginal: 1200,
        juros: 300,
        vencimento: "2025-06-01",
        descricao: "Honorários contábeis — maio/2025",
        status: "EmAberto",
      },
      {
        id: "portal-d2",
        clienteId: "portal-demo",
        valor: 800,
        vencimento: "2026-02-10",
        descricao: "Declaração anual",
        status: "EmAberto",
      }
    );
  }
  const c = store.clientes[0];
  if (!c?.id) return;
  store.portalContas.push({
    cpfCnpj: (c.cpf ?? "").replace(/\D/g, ""),
    email: (c.email ?? "cliente@demo.com").toLowerCase(),
    senha: "123456",
    clienteId: c.id,
    nome: c.nome,
  });
}

seedScreenshotDemoData();
seedPortalMockData();

function nextIdCliente(): string {
  return String(nextId++);
}
function nextIdInadimplencia(): string {
  return String(nextId++);
}

function getClienteNome(clienteId: string): string {
  const c = store.clientes.find((x) => x.id === clienteId);
  return c?.nome ?? `Cliente #${clienteId}`;
}

function getCliente(id: string): Cliente | undefined {
  return store.clientes.find((x) => x.id === id);
}

function diasAtraso(vencimento: string): number {
  const v = new Date(vencimento.split("T")[0]);
  const hoje = new Date();
  v.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje.getTime() - v.getTime()) / (24 * 60 * 60 * 1000)));
}

function protocolo(id: string | number, vencimento: string): string {
  const d = vencimento.split("T")[0].replace(/-/g, "");
  return `DIV-${d}-${String(id).padStart(4, "0")}`;
}

function readAuthItem(key: string): string | null {
  if (typeof sessionStorage !== "undefined") {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) return sessionValue;
  }
  return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
}

function getCurrentUserByToken() {
  const token = readAuthItem("sgi_token");
  if (!token) return null;
  const userId = token.replace("mock-token-", "");
  return store.usuarios.find((u) => u.usuarioId === userId) ?? null;
}

function mapSituacaoToStatusCliente(situacao: Cliente["situacao"]): string {
  if (situacao === "Inativo") return "INATIVO";
  if (situacao === "Inadimplente") return "INADIMPLENTE";
  return "ATIVO";
}

function filtrarClientesMock(params: URLSearchParams): Cliente[] {
  const busca = (params.get("busca") ?? params.get("termo") ?? params.get("nome") ?? "").trim().toLowerCase();
  const status = params.get("statusCliente")?.toUpperCase();

  return store.clientes.filter((c) => {
    const statusCliente = mapSituacaoToStatusCliente(c.situacao ?? "Ativo");
    if (status && statusCliente !== status) return false;
    if (!busca) return true;
    const codigo = (c.codigo ?? "").toLowerCase();
    const nome = c.nome.toLowerCase();
    const doc = (c.cpf ?? "").replace(/\D/g, "");
    const buscaDoc = busca.replace(/\D/g, "");
    return (
      codigo === busca ||
      codigo.startsWith(busca) ||
      codigo.includes(busca) ||
      nome.includes(busca) ||
      (buscaDoc.length > 0 && doc.includes(buscaDoc)) ||
      (c.cpf ?? "").toLowerCase().includes(busca)
    );
  });
}

function ensureMockClientesParaDocumentosStaff() {
  if (store.clientes.length > 0) return;
  store.clientes.push({
    id: "mock-cli-1",
    codigo: "99",
    nome: "Cliente Portal Demo",
    email: "cliente@demo.com",
    cpf: "123.456.789-00",
    situacao: "Ativo",
  });
}

function seedDocumentosClientesStaffMock() {
  ensureMockClientesParaDocumentosStaff();
  if (store.documentosClientes.length > 0) return;
  const cliente = store.clientes[0];
  store.documentosClientes.push(
    {
      documentoId: `doc-staff-${nextDocumentoStaffId++}`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteCodigo: cliente.codigo,
      tipo: "COMPROVANTE",
      status: "ENVIADO",
      nomeOriginal: "comprovante-pagamento.pdf",
      contentType: "application/pdf",
      tamanhoBytes: 245_760,
      observacaoCliente: "Segue comprovante do pagamento referente aos honorários.",
      enviadoEm: "2026-03-10T14:30:00",
    },
    {
      documentoId: `doc-staff-${nextDocumentoStaffId++}`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteCodigo: cliente.codigo,
      tipo: "NOTA_FISCAL",
      status: "EM_ANALISE",
      nomeOriginal: "nota-fiscal.pdf",
      contentType: "application/pdf",
      tamanhoBytes: 128_000,
      observacaoCliente: "Nota fiscal para conferência.",
      respostaEscritorio: "Recebemos o documento. Estamos conferindo.",
      respondidoEm: "2026-03-11T09:15:00",
      respondidoPorNome: "Responsável Financeiro",
      enviadoEm: "2026-03-09T10:00:00",
    }
  );
}

function filtrarDocumentosStaffMock(params: Record<string, unknown>): DocumentoCliente[] {
  seedDocumentosClientesStaffMock();
  sincronizarDocumentosPortalParaStaff();
  let list = [...store.documentosClientes];
  const clienteId = params.clienteId != null ? String(params.clienteId) : "";
  const status = params.status != null ? String(params.status).toUpperCase() : "";
  const tipo = params.tipo != null ? String(params.tipo).toUpperCase() : "";
  if (clienteId) list = list.filter((d) => d.clienteId === clienteId);
  if (status) list = list.filter((d) => d.status === status);
  if (tipo) list = list.filter((d) => d.tipo === tipo);
  return list.sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
}

function paginarDocumentosStaffMock(list: DocumentoCliente[], page: number, size: number) {
  const start = page * size;
  const content = list.slice(start, start + size);
  return {
    content,
    totalElements: list.length,
    totalPages: Math.max(1, Math.ceil(list.length / Math.max(size, 1))),
    number: page,
    size,
  };
}

function resumoDocumentosStaffMock(): ResumoDocumentosClientes {
  seedDocumentosClientesStaffMock();
  sincronizarDocumentosPortalParaStaff();
  return {
    pendentes: store.documentosClientes.filter((d) => d.status === "ENVIADO").length,
    recebidos: store.documentosClientes.filter((d) => d.status === "RECEBIDO").length,
    emAnalise: store.documentosClientes.filter((d) => d.status === "EM_ANALISE").length,
    arquivados: store.documentosClientes.filter((d) => d.status === "ARQUIVADO").length,
  };
}

function getDocumentoStaffMock(id: string): DocumentoCliente | undefined {
  sincronizarDocumentosPortalParaStaff();
  return store.documentosClientes.find((d) => d.documentoId === id);
}

type PortalDocumentoStore = PortalDocumento & { clienteId: string };

function staffFromPortalDoc(doc: PortalDocumentoStore): DocumentoCliente {
  const cliente = store.clientes.find((c) => c.id === doc.clienteId);
  return {
    documentoId: doc.id,
    clienteId: doc.clienteId,
    clienteNome: cliente?.nome,
    clienteCodigo: cliente?.codigo,
    dividaId: doc.dividaId,
    tipo: doc.tipo,
    status: doc.status,
    nomeOriginal: doc.nomeArquivo ?? "documento",
    contentType: "application/octet-stream",
    tamanhoBytes: 0,
    observacaoCliente: doc.observacao,
    respostaEscritorio: doc.respostaEscritorio,
    respondidoEm: doc.respondidoEm,
    respondidoPorNome: doc.respondidoPorNome,
    enviadoEm: doc.criadoEm ?? new Date().toISOString(),
  };
}

function upsertStaffFromPortalDoc(doc: PortalDocumentoStore) {
  const idx = store.documentosClientes.findIndex((d) => d.documentoId === doc.id);
  const staff = staffFromPortalDoc(doc);
  if (idx >= 0) {
    const existing = store.documentosClientes[idx];
    store.documentosClientes[idx] = {
      ...staff,
      ...existing,
      clienteNome: existing.clienteNome ?? staff.clienteNome,
      clienteCodigo: existing.clienteCodigo ?? staff.clienteCodigo,
      nomeOriginal: existing.nomeOriginal || staff.nomeOriginal,
      observacaoCliente: existing.observacaoCliente ?? staff.observacaoCliente,
    };
  } else {
    store.documentosClientes.unshift(staff);
  }
}

function syncPortalFromStaff(staff: DocumentoCliente) {
  const idx = store.portalDocumentos.findIndex((d) => d.id === staff.documentoId);
  if (idx < 0) return;
  const portal = store.portalDocumentos[idx];
  store.portalDocumentos[idx] = {
    ...portal,
    status: staff.status,
    respostaEscritorio: staff.respostaEscritorio,
    respondidoEm: staff.respondidoEm,
    respondidoPorNome: staff.respondidoPorNome,
  };
}

function sincronizarDocumentosPortalParaStaff() {
  for (const doc of store.portalDocumentos) {
    if (!store.documentosClientes.some((d) => d.documentoId === doc.id)) {
      store.documentosClientes.unshift(staffFromPortalDoc(doc));
    }
  }
}

export function createMockClient() {
  return {
    get<T = unknown>(url: string, config?: { params?: Record<string, unknown> }) {
      const matchDocsCliente = url.match(/^\/api\/clientes\/([\w-]+)\/documentos$/);
      if (matchDocsCliente) {
        const clienteId = matchDocsCliente[1];
        const params = config?.params ?? {};
        const page = Number(params.page ?? 0);
        const size = Number(params.size ?? 20);
        const list = filtrarDocumentosStaffMock({ ...params, clienteId });
        return Promise.resolve({ data: paginarDocumentosStaffMock(list, page, size) } as { data: T });
      }
      if (url.startsWith("/api/documentos-clientes")) {
        const matchArquivo = url.match(/^\/api\/documentos-clientes\/([\w-]+)\/arquivo$/);
        if (matchArquivo) {
          const doc = getDocumentoStaffMock(matchArquivo[1]);
          if (!doc) return Promise.reject(new Error("Documento não encontrado."));
          const blob = new Blob([`Mock arquivo: ${doc.nomeOriginal}`], { type: doc.contentType });
          return Promise.resolve({ data: blob } as { data: T });
        }
        const matchId = url.match(/^\/api\/documentos-clientes\/([\w-]+)$/);
        if (matchId) {
          const doc = getDocumentoStaffMock(matchId[1]);
          if (!doc) return Promise.reject(new Error("Documento não encontrado."));
          return Promise.resolve({ data: doc } as { data: T });
        }
        if (url === "/api/documentos-clientes/resumo") {
          return Promise.resolve({ data: resumoDocumentosStaffMock() } as { data: T });
        }
        if (url === "/api/documentos-clientes") {
          const params = config?.params ?? {};
          const page = Number(params.page ?? 0);
          const size = Number(params.size ?? 20);
          const list = filtrarDocumentosStaffMock(params);
          return Promise.resolve({ data: paginarDocumentosStaffMock(list, page, size) } as { data: T });
        }
      }
      if (url.startsWith("/api/portal/")) {
        const sessao = getPortalSessao();
        if (url === "/api/portal/resumo") {
          if (!sessao) return Promise.reject(new Error("Não autorizado."));
          const abertas = dividasAbertasCliente(sessao.clienteId);
          const vencidas = abertas.filter((d) => diasAtraso(d.vencimento) > 0);
          const saldo = abertas.reduce((s, d) => s + (d.valor ?? 0), 0);
          return Promise.resolve({
            data: {
              saldoDevedorTotal: saldo,
              quantidadeDividasAbertas: abertas.length,
              quantidadeDividasVencidas: vencidas.length,
              clienteNome: sessao.nome,
            },
          } as { data: T });
        }
        if (url.startsWith("/api/portal/dividas")) {
          if (!sessao) return Promise.reject(new Error("Não autorizado."));
          const matchId = url.match(/^\/api\/portal\/dividas\/([\w-]+)$/);
          if (matchId) {
            const d = store.inadimplentes.find((i) => i.id === matchId[1] && i.clienteId === sessao.clienteId);
            if (!d) return Promise.reject(new Error("Dívida não encontrada."));
            const pags = store.pagamentos
              .filter((p) => p.dividaId === d.id)
              .map((p) => ({
                id: p.pagamentoId,
                dataPagamento: p.dataPagamento,
                valor: p.valorPago,
                metodo: p.metodoPagamento ?? "PIX",
              }));
            return Promise.resolve({
              data: {
                ...mapDividaPortal(d),
                valorOriginal: d.valorOriginal,
                juros: d.juros,
                pagamentos: pags,
              },
            } as { data: T });
          }
          const abertas = dividasAbertasCliente(sessao.clienteId).map(mapDividaPortal);
          return Promise.resolve({ data: abertas } as { data: T });
        }
        if (url === "/api/portal/extrato") {
          if (!sessao) return Promise.reject(new Error("Não autorizado."));
          const movimentacoes = dividasAbertasCliente(sessao.clienteId).map((d) => ({
            data: d.vencimento,
            descricao: d.descricao ?? "Dívida",
            valor: d.valor ?? 0,
            tipo: "DEBITO",
          }));
          return Promise.resolve({ data: { movimentacoes } } as { data: T });
        }
        if (url === "/api/portal/documentos") {
          if (!sessao) return Promise.reject(new Error("Não autorizado."));
          const params = config?.params ?? {};
          const page = Number(params.page ?? 0);
          const size = Number(params.size ?? 20);
          const docs = store.portalDocumentos
            .filter((d) => d.clienteId === sessao.clienteId)
            .map(({ clienteId: _c, ...doc }) => doc);
          const start = page * size;
          const content = docs.slice(start, start + size);
          return Promise.resolve({
            data: {
              content,
              totalElements: docs.length,
              totalPages: Math.max(1, Math.ceil(docs.length / Math.max(size, 1))),
              number: page,
              size,
            },
          } as { data: T });
        }
        const matchDownload = url.match(/^\/api\/portal\/documentos\/([\w-]+)\/download$/);
        if (matchDownload) {
          const doc = store.portalDocumentos.find((d) => d.id === matchDownload[1]);
          if (!doc) return Promise.reject(new Error("Documento não encontrado."));
          const blob = new Blob([`Mock documento: ${doc.nomeArquivo}`], { type: "application/octet-stream" });
          return Promise.resolve({ data: blob } as { data: T });
        }
        return Promise.reject(new Error(`Mock: rota portal não encontrada: ${url}`));
      }
      if (url.startsWith("/api/clientes")) {
        const urlObj = new URL(url, "http://mock.local");
        const params = config?.params ?? {};
        for (const [key, value] of Object.entries(params)) {
          if (value != null && value !== "") urlObj.searchParams.set(key, String(value));
        }
        const list = filtrarClientesMock(urlObj.searchParams).map((c) => ({
          ...c,
          id: String(c.id),
          clienteId: String(c.id),
          cpfCnpj: c.cpf,
          statusCliente: mapSituacaoToStatusCliente(c.situacao ?? "Ativo"),
        }));
        return Promise.resolve({ data: list } as { data: T });
      }
      if (url === "/api/inadimplentes") {
        const itens = store.inadimplentes.map((i) => ({
          ...i,
          clienteNome: getClienteNome(i.clienteId),
        }));
        return Promise.resolve({ data: itens } as { data: T });
      }
      const matchPagsDivida = url.match(/^\/api\/pagamentos\/divida\/([\w-]+)$/);
      if (matchPagsDivida) {
        const dividaId = matchPagsDivida[1];
        const pags = store.pagamentos.filter((p) => p.dividaId === dividaId);
        const daDivida = store.inadimplentes.find((i) => i.id === dividaId)?.pagamentos ?? [];
        const merged = [...pags];
        for (const p of daDivida) {
          if (!merged.some((m) => m.pagamentoId === p.pagamentoId)) merged.push(p);
        }
        return Promise.resolve({ data: merged } as { data: T });
      }
      if (url.startsWith("/api/pagamentos")) {
        const urlObj = new URL(url, "http://x");
        const dividaId = urlObj.searchParams.get("dividaId") ?? (config?.params?.dividaId != null ? String(config.params.dividaId) : "");
        const pags = dividaId
          ? store.pagamentos.filter((p) => p.dividaId === dividaId)
          : store.pagamentos;
        return Promise.resolve({ data: pags } as { data: T });
      }
      if (url.startsWith("/api/relatorios/resumo")) {
        const urlObj = new URL(url, "http://x");
        const diasParam = urlObj.searchParams.get("dias");
        const periodoInicio = urlObj.searchParams.get("periodoInicio");
        const periodoFim = urlObj.searchParams.get("periodoFim");
        const dias = diasParam ? Number(diasParam) : null;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const filtrarPorDias = (dataIso: string) => {
          if (dias == null || !dataIso) return true;
          const d = new Date(dataIso.split("T")[0]);
          d.setHours(0, 0, 0, 0);
          const limite = new Date(hoje);
          limite.setDate(limite.getDate() - dias);
          return d >= limite;
        };
        let base = store.inadimplentes;
        if (dias != null && !Number.isNaN(dias)) {
          base = base.filter((i) => filtrarPorDias(i.vencimento));
        }
        if (periodoInicio || periodoFim) {
          const inicio = periodoInicio ? new Date(periodoInicio) : new Date(0);
          const fim = periodoFim ? new Date(periodoFim) : new Date();
          base = base.filter((i) => {
            const dt = new Date((i.updatedAt ?? i.createdAt ?? i.vencimento).split("T")[0]);
            return dt >= inicio && dt <= fim;
          });
        }
        const emAberto = base.filter((i) => (i.status ?? "EmAberto") === "EmAberto");
        const todosPagos = base.filter((i) => i.status === "Pago");
        const totalPago = todosPagos.reduce((s, i) => s + (i.valor ?? 0), 0);
        if (url.startsWith("/api/relatorios/resumo-financeiro")) {
          const resumoFinanceiro: ResumoFinanceiro = {
            totalEmAberto: emAberto.reduce((s, i) => s + (i.valor ?? 0), 0),
            totalRecebido: totalPago,
            periodoInicio: periodoInicio ?? undefined,
            periodoFim: periodoFim ?? undefined,
          };
          return Promise.resolve({ data: resumoFinanceiro } as { data: T });
        }
        const resumo: ResumoRelatorio = {
          totalClientes: store.clientes.length,
          totalDividas: base.length,
          totalEmAberto: emAberto.reduce((s, i) => s + (i.valor ?? 0), 0),
          totalPago,
        };
        return Promise.resolve({ data: resumo } as { data: T });
      }

      if (url.startsWith("/api/relatorios/ranking-devedores")) {
        const urlObj = new URL(url, "http://x");
        const limit = Math.min(50, Math.max(10, Number(urlObj.searchParams.get("limit")) || 20));
        const valorMin = Number(urlObj.searchParams.get("valorMin")) || 0;
        const qtdDividasMin = Number(urlObj.searchParams.get("qtdDividas")) || 0;
        const diasAtrasoMin = Number(urlObj.searchParams.get("diasAtraso")) || 0;

        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const porCliente = new Map<
          string,
          { valor: number; qtd: number; dias: number[] }
        >();
        for (const d of emAberto) {
          const dias = diasAtraso(d.vencimento);
          const cid = String(d.clienteId);
          const cur = porCliente.get(cid);
          if (!cur) {
            porCliente.set(cid, { valor: d.valor, qtd: 1, dias: [dias] });
          } else {
            cur.valor += d.valor;
            cur.qtd += 1;
            cur.dias.push(dias);
          }
        }
        let items: RankingDevedorItem[] = [];
        porCliente.forEach((v, clienteId) => {
          if (v.valor < valorMin || v.qtd < qtdDividasMin) return;
          const mediaDias = Math.round(v.dias.reduce((a, b) => a + b, 0) / v.dias.length);
          if (mediaDias < diasAtrasoMin) return;
          const status: RankingDevedorItem["status"] =
            mediaDias > 60 ? "Crítico" : mediaDias > 30 ? "Atenção" : "Recente";
          const c = getCliente(clienteId);
          items.push({
            posicao: 0,
            clienteId,
            clienteNome: getClienteNome(clienteId),
            cpfCnpj: c?.cpf ?? "",
            valorDevido: v.valor,
            qtdDividas: v.qtd,
            mediaDiasAtraso: mediaDias,
            status,
          });
        });
        items.sort((a, b) => b.valorDevido - a.valorDevido);
        items = items.slice(0, limit).map((it, i) => ({ ...it, posicao: i + 1 }));
        return Promise.resolve({ data: items } as { data: T });
      }

      const matchExtrato = url.match(/^\/api\/relatorios\/extrato-cliente\/([\w-]+)$/);
      if (matchExtrato) {
        const clienteId = String(matchExtrato[1]);
        const c = getCliente(clienteId);
        if (!c) return Promise.reject(new Error(`Mock: cliente ${clienteId} não encontrado`));
        const dividasCliente = store.inadimplentes.filter(
          (d) => d.clienteId === clienteId && (d.status ?? "EmAberto") !== "Pago"
        );
        const dividasAtivas = dividasCliente.map((d) => ({
          id: d.id ?? 0,
          protocolo: protocolo(d.id ?? 0, d.vencimento),
          descricao: d.descricao ?? `Serviços ${d.vencimento.slice(0, 7)}`,
          vencimento: d.vencimento.split("T")[0],
          valorOriginal: d.valor,
          valorDevido: d.valor,
          status: (d.status ?? "EmAberto") === "EmAberto" ? "Em aberto" : "Parcial",
          diasAtraso: diasAtraso(d.vencimento),
        }));
        const saldoTotal = dividasAtivas.reduce((s, d) => s + d.valorDevido, 0);
        const pagos = store.inadimplentes.filter(
          (d) => d.clienteId === clienteId && d.status === "Pago"
        );
        const historicoPagamentos = pagos.map((d) => ({
          data: (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0],
          protocolo: protocolo(d.id ?? "0", d.vencimento),
          valorPago: d.valor,
          metodo: "PIX",
          saldoApos: 0,
        }));
        const notificacoes = [
          { data: new Date().toISOString().split("T")[0], tipo: "Cobrança", status: "Enviado", tentativas: 1 },
        ];
        const extrato: ExtratoCliente = {
          cliente: {
            nome: c.nome,
            cpfCnpj: c.cpf ?? "",
            telefone: c.telefone,
            email: c.email,
            status: c.situacao ?? "Ativo",
            saldoDevedorTotal: saldoTotal,
          },
          dividasAtivas,
          historicoPagamentos,
          notificacoes,
        };
        return Promise.resolve({ data: extrato } as { data: T });
      }

      if (url.startsWith("/api/relatorios/inadimplencia-periodo")) {
        const urlObj = new URL(url, "http://x");
        const dataInicio = urlObj.searchParams.get("dataInicio") ?? "";
        const dataFim = urlObj.searchParams.get("dataFim") ?? "";
        const inicio = dataInicio ? new Date(dataInicio) : new Date(0);
        const fim = dataFim ? new Date(dataFim) : new Date();
        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const noPeriodo = emAberto.filter((d) => {
          const v = new Date(d.vencimento.split("T")[0]);
          return v >= inicio && v <= fim;
        });
        const porCliente = new Map<
          string,
          { qtd: number; valor: number; statusPior: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"] }
        >();
        const statusOrd = (s: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"]) =>
          s === "VENCIDA" ? 3 : s === "PARCIAL" ? 2 : 1;
        for (const d of noPeriodo) {
          const dias = diasAtraso(d.vencimento);
          const statusMap: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"] =
            dias > 0 ? "VENCIDA" : (d.status ?? "EmAberto") === "EmAberto" ? "EM_ABERTO" : "PARCIAL";
          const cur = porCliente.get(d.clienteId);
          if (!cur) {
            porCliente.set(d.clienteId, { qtd: 1, valor: d.valor, statusPior: statusMap });
          } else {
            cur.qtd += 1;
            cur.valor += d.valor;
            if (statusOrd(statusMap) > statusOrd(cur.statusPior)) cur.statusPior = statusMap;
          }
        }
        const detalhamento = Array.from(porCliente.entries()).map(([clienteId, v]) => {
          const c = getCliente(clienteId);
          return {
            clienteId,
            clienteNome: getClienteNome(clienteId),
            cpfCnpj: c?.cpf ?? "",
            qtdDividas: v.qtd,
            valorTotal: v.valor,
            statusPior: v.statusPior,
          };
        });
        detalhamento.sort((a, b) => b.valorTotal - a.valorTotal);
        const valorVencido = noPeriodo.reduce((s, d) => s + d.valor, 0);
        const res: InadimplenciaPeriodoRelatorio = {
          dataInicio,
          dataFim,
          totalClientes: porCliente.size,
          valorTotal: valorVencido,
          dividasVencidasNoPeriodo: noPeriodo.length,
          valorVencidoNoPeriodo: valorVencido,
          detalhamento,
        };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/pagamentos-recebidos")) {
        const urlObj = new URL(url, "http://x");
        const dataInicio = urlObj.searchParams.get("dataInicio") ?? "";
        const dataFim = urlObj.searchParams.get("dataFim") ?? "";
        const inicio = dataInicio ? new Date(dataInicio) : new Date(0);
        const fim = dataFim ? new Date(dataFim) : new Date();
        const pagos = store.inadimplentes.filter((d) => d.status === "Pago");
        const noPeriodo = pagos.filter((d) => {
          const dt = (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0];
          const v = new Date(dt);
          return v >= inicio && v <= fim;
        });
        const metodos = ["PIX", "Transferência", "Dinheiro"] as const;
        const porMetodo = metodos.map((metodo, i) => {
          const frac = i === 0 ? 0.65 : i === 1 ? 0.25 : 0.1;
          const valor = Math.round(noPeriodo.reduce((s, d) => s + d.valor, 0) * frac);
          return { metodo, valor, percentual: 0 };
        });
        const total = porMetodo.reduce((s, m) => s + m.valor, 0);
        porMetodo.forEach((m) => {
          m.percentual = total > 0 ? (m.valor / total) * 100 : 0;
        });
        const detalhamento = noPeriodo.map((d) => ({
          data: (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0],
          clienteNome: getClienteNome(d.clienteId),
          protocolo: protocolo(d.id ?? "0", d.vencimento),
          valor: d.valor,
          metodo: "PIX",
          saldoRestante: 0,
          vencimento: d.vencimento,
          mesReferencia: (() => {
            const [y, m] = (d.vencimento || "").split("T")[0].split("-");
            return y && m ? `${m}/${y}` : undefined;
          })(),
          confirmadoPor: "josecarlos",
        }));
        const res: PagamentosRecebidosRelatorio = {
          dataInicio,
          dataFim,
          totalPagamentos: noPeriodo.length,
          valorTotal: total,
          porMetodo,
          detalhamento,
        };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/aging")) {
        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const faixas = [
          { nome: "0-30 dias", min: 0, max: 30 },
          { nome: "31-60 dias", min: 31, max: 60 },
          { nome: "61-90 dias", min: 61, max: 90 },
          { nome: "Acima de 90 dias", min: 91, max: 9999 },
        ];
        const valorTotalGeral = emAberto.reduce((s, d) => s + d.valor, 0);
        const faixasRes = faixas.map((f) => {
          const divs = emAberto.filter((d) => {
            const dias = diasAtraso(d.vencimento);
            return dias >= f.min && dias <= f.max;
          });
          const valorTotal = divs.reduce((s, d) => s + d.valor, 0);
          const percentual = valorTotalGeral > 0 ? (valorTotal / valorTotalGeral) * 100 : 0;
          return {
            faixa: f.nome,
            qtdDividas: divs.length,
            valorTotal,
            percentual,
          };
        });
        const res: AgingRelatorio = { faixas: faixasRes, valorTotalGeral };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/efetividade-cobranca")) {
        const urlObj = new URL(url, "http://x");
        const mes = urlObj.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
        const res: EfetividadeCobrancaRelatorio = {
          periodo: mes,
          totalNotificacoes: 45,
          emailsEntregues: 42,
          falhas: 3,
          taxaEntrega: 93.3,
          cobrancasComPagamento: 18,
          taxaConversao: 40,
          tempoMedioDias: 5.2,
          comparativoAnterior: {
            periodo: "Dez/2024",
            taxaConversao: 35.2,
            variacaoPp: 4.8,
          },
        };
        return Promise.resolve({ data: res } as { data: T });
      }
      if (url === "/api/usuarios/pendentes") {
        const pendentes: UsuarioPendente[] = store.usuarios
          .filter((u) => u.statusUsuario === "PENDENTE_APROVACAO")
          .map(({ senha: _s, telefone: _t, ...u }) => u);
        return Promise.resolve({ data: pendentes } as { data: T });
      }
      if (url === "/api/usuarios/ativos") {
        const ativos: UsuarioAtivo[] = store.usuarios
          .filter((u) => u.statusUsuario === "ATIVO")
          .map(({ senha: _s, ...u }) => u as UsuarioAtivo);
        return Promise.resolve({ data: ativos } as { data: T });
      }

      if (url === "/api/sicoob/status") {
        const status: SicoobStatus = {
          enabled: true,
          mock: true,
          configuredForApi: false,
          clientIdConfigured: false,
          certificateConfigured: false,
          pixChaveConfigured: true,
          contasBoletoConfigured: true,
          webhookSecretConfigured: false,
          mensagem: "Integração Sicoob em modo simulação (mock).",
        };
        return Promise.resolve({ data: status } as { data: T });
      }

      const matchCobrancasDivida = url.match(/^\/api\/sicoob\/dividas\/([\w-]+)\/cobrancas$/);
      if (matchCobrancasDivida) {
        const dividaId = matchCobrancasDivida[1];
        const list = store.cobrancasSicoob.filter((c) => c.dividaId === dividaId);
        return Promise.resolve({ data: list } as { data: T });
      }

      const matchPagamentosDivida = url.match(/^\/api\/pagamentos\/divida\/([\w-]+)$/);
      if (matchPagamentosDivida) {
        const dividaId = matchPagamentosDivida[1];
        const list = store.pagamentos.filter((p) => p.dividaId === dividaId);
        return Promise.resolve({ data: list } as { data: T });
      }

      const matchCobranca = url.match(/^\/api\/sicoob\/cobrancas\/([\w-]+)$/);
      if (matchCobranca) {
        const cob = store.cobrancasSicoob.find((c) => c.cobrancaId === matchCobranca[1]);
        if (!cob) return Promise.reject(new Error("Cobrança Sicoob não encontrada."));
        return Promise.resolve({ data: cob } as { data: T });
      }

      if (url.startsWith("/api/lotes-envio-boletos")) {
        const matchArquivo = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/itens\/([\w-]+)\/arquivo$/);
        if (matchArquivo) {
          const [, loteId, itemId] = matchArquivo;
          const lote = store.lotesEnvioBoletos.find((l) => l.loteId === loteId);
          const item = lote?.itens?.find((i) => idItemEnvioBoleto(i) === itemId);
          const nome = item?.nomeArquivoOriginal ?? "boleto.pdf";
          const blob = new Blob([`PDF mock: ${nome}`], { type: "application/pdf" });
          return Promise.resolve({ data: blob } as { data: T });
        }
        const matchCsv = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/relatorio\.csv$/);
        if (matchCsv) {
          const loteId = matchCsv[1];
          const lote = store.lotesEnvioBoletos.find((l) => l.loteId === loteId);
          const linhas = ["cliente,email,arquivo,status,erro,simulado"];
          for (const item of lote?.itens ?? []) {
            linhas.push(
              `"${item.clienteNome ?? ""}","${item.emailDestinatario ?? ""}","${item.nomeArquivoOriginal}","${item.status}","${item.erro ?? ""}","${item.simulado ? "sim" : "nao"}"`
            );
          }
          const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
          return Promise.resolve({ data: blob } as { data: T });
        }
        const matchResultado = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/resultado-envio$/);
        if (matchResultado) {
          const lote = store.lotesEnvioBoletos.find((l) => l.loteId === matchResultado[1]);
          if (!lote) return Promise.reject(new Error("Lote não encontrado."));
          return Promise.resolve({ data: buildResultadoEnvioLote(lote) } as { data: T });
        }
        const matchLote = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)$/);
        if (matchLote) {
          const lote = store.lotesEnvioBoletos.find((l) => l.loteId === matchLote[1]);
          if (!lote) return Promise.reject(new Error("Lote não encontrado."));
          return Promise.resolve({ data: lote } as { data: T });
        }
        const urlObj = new URL(url, "http://mock.local");
        const page = Number(urlObj.searchParams.get("page") ?? config?.params?.page ?? 0);
        const size = Number(urlObj.searchParams.get("size") ?? config?.params?.size ?? 10);
        const statusFiltro = String(urlObj.searchParams.get("status") ?? config?.params?.status ?? "");
        let lista = [...store.lotesEnvioBoletos].map(loteToResumo);
        if (statusFiltro) lista = lista.filter((l) => String(l.status).toUpperCase() === statusFiltro.toUpperCase());
        lista.sort((a, b) => String(b.criadoEm ?? "").localeCompare(String(a.criadoEm ?? "")));
        const inicio = page * size;
        const content = lista.slice(inicio, inicio + size);
        return Promise.resolve({
          data: {
            content,
            totalElements: lista.length,
            totalPages: Math.max(1, Math.ceil(lista.length / size)),
            number: page,
            size,
          },
        } as { data: T });
      }

      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    post<T = unknown>(url: string, body: unknown) {
      if (url === "/api/portal/auth/login") {
        const payload = (body ?? {}) as { cpfCnpj?: string; senha?: string };
        const doc = String(payload.cpfCnpj ?? "").replace(/\D/g, "");
        const senha = String(payload.senha ?? "");
        const conta = store.portalContas.find((c) => c.cpfCnpj === doc);
        if (!conta || conta.senha !== senha) {
          return Promise.reject(new Error("CPF/CNPJ ou senha inválidos."));
        }
        return Promise.resolve({
          data: {
            token: `portal-mock-${conta.clienteId}`,
            clienteId: conta.clienteId,
            clienteNome: conta.nome,
          },
        } as { data: T });
      }
      if (url === "/api/portal/auth/ativar") {
        const payload = (body ?? {}) as { cpfCnpj?: string; email?: string; senha?: string; confirmarSenha?: string };
        const doc = String(payload.cpfCnpj ?? "").replace(/\D/g, "");
        const email = String(payload.email ?? "").trim().toLowerCase();
        const senha = String(payload.senha ?? "");
        const confirmarSenha = String(payload.confirmarSenha ?? "");
        if (senha !== confirmarSenha) {
          return Promise.reject(new Error("Confirmação de senha não confere."));
        }
        const cliente = store.clientes.find((c) => (c.cpf ?? "").replace(/\D/g, "") === doc);
        if (!cliente?.id) return Promise.reject(new Error("Cliente não encontrado para o CPF/CNPJ informado."));
        if ((cliente.email ?? "").trim().toLowerCase() !== email) {
          return Promise.reject(new Error("E-mail não confere com o cadastro do escritório."));
        }
        const existente = store.portalContas.findIndex((c) => c.cpfCnpj === doc);
        const conta = { cpfCnpj: doc, email, senha, clienteId: cliente.id, nome: cliente.nome };
        if (existente >= 0) store.portalContas[existente] = conta;
        else store.portalContas.push(conta);
        return Promise.resolve({
          data: {
            token: `portal-mock-${cliente.id}`,
            clienteId: cliente.id,
            clienteNome: cliente.nome,
          },
        } as { data: T });
      }
      if (url === "/api/portal/documentos") {
        const sessao = getPortalSessao();
        if (!sessao) return Promise.reject(new Error("Não autorizado."));
        const form = body as FormData;
        const arquivo = form instanceof FormData ? form.get("arquivo") : null;
        const tipo = (form instanceof FormData ? String(form.get("tipo") ?? "OUTRO") : "OUTRO") as TipoDocumentoCliente;
        const dividaId = form instanceof FormData ? String(form.get("dividaId") ?? "") : "";
        const observacao = form instanceof FormData ? String(form.get("observacao") ?? "") : "";
        const nomeArquivo =
          arquivo && typeof arquivo === "object" && "name" in arquivo ? String((arquivo as File).name) : "documento.pdf";
        const doc: PortalDocumento & { clienteId: string } = {
          id: `pdoc-${nextPortalDocId++}`,
          tipo,
          nomeArquivo,
          status: "ENVIADO",
          observacao: observacao || undefined,
          dividaId: dividaId || undefined,
          criadoEm: new Date().toISOString(),
          clienteId: sessao.clienteId,
        };
        store.portalDocumentos.unshift(doc);
        upsertStaffFromPortalDoc(doc);
        return Promise.resolve({ data: doc } as { data: T });
      }
      if (url === "/api/auth/login") {
        const payload = (body ?? {}) as { login?: string; senha?: string };
        const login = String(payload.login ?? "").trim();
        const senha = String(payload.senha ?? "");
        const user = store.usuarios.find((u) => u.login === login);
        if (!user || user.senha !== senha) return Promise.reject(new Error("Credenciais inválidas."));
        if (user.statusUsuario === "PENDENTE_APROVACAO") {
          return Promise.reject(new Error("Cadastro pendente de aprovação da proprietária."));
        }
        return Promise.resolve({
          data: {
            token: `mock-token-${user.usuarioId}`,
            perfil: user.perfil,
            usuario: {
              nome: user.nome,
              login: user.login,
              perfil: user.perfil,
            },
          },
        } as { data: T });
      }
      if (url === "/api/auth/register") {
        const payload = (body ?? {}) as { nome?: string; login?: string; senha?: string };
        const nome = String(payload.nome ?? "").trim();
        const login = String(payload.login ?? "").trim();
        const senha = String(payload.senha ?? "");
        if (!nome || !login || !senha) {
          return Promise.reject(new Error("Nome, login e senha são obrigatórios."));
        }
        const loginExiste = store.usuarios.some((u) => u.login.toLowerCase() === login.toLowerCase());
        if (loginExiste) return Promise.reject(new Error("Login já cadastrado."));
        const novoId = `u-${Date.now()}`;
        store.usuarios.push({
          usuarioId: novoId,
          login,
          nome,
          telefone: "",
          perfil: "RESPONSAVEL_FINANCEIRO",
          statusUsuario: "PENDENTE_APROVACAO",
          ultimoAcesso: null,
          criadoEm: new Date().toISOString(),
          senha,
        });
        return Promise.resolve({ data: { ok: true } } as { data: T });
      }
      if (url === "/api/usuarios") {
        const payload = (body ?? {}) as {
          nome?: string;
          email?: string;
          senha?: string;
          permissao?: string;
          telefone1?: string;
        };
        const nome = String(payload.nome ?? "").trim();
        const login = String(payload.email ?? "").trim().toLowerCase();
        const senha = String(payload.senha ?? "123456");
        const permissaoRaw = String(payload.permissao ?? "RESPONSAVEL_FINANCEIRO").toUpperCase();
        const perfilValido: PerfilUsuario =
          permissaoRaw === "PROPRIETARIA" || permissaoRaw === "FUNCIONARIO" || permissaoRaw === "RESPONSAVEL_FINANCEIRO"
            ? (permissaoRaw as PerfilUsuario)
            : "RESPONSAVEL_FINANCEIRO";
        if (!nome || !login) {
          return Promise.reject(new Error("Nome e e-mail são obrigatórios."));
        }
        const loginExiste = store.usuarios.some((u) => u.login.toLowerCase() === login);
        if (loginExiste) return Promise.reject(new Error("Login já cadastrado."));
        const novoId = `u-${Date.now()}`;
        store.usuarios.push({
          usuarioId: novoId,
          login,
          nome,
          telefone: payload.telefone1 ?? "",
          perfil: perfilValido,
          statusUsuario: "PENDENTE_APROVACAO",
          ultimoAcesso: null,
          criadoEm: new Date().toISOString(),
          senha,
        });
        return Promise.resolve({ data: { usuarioId: novoId, ok: true } } as { data: T });
      }
      if (url === "/api/clientes") {
        const payload = body as Cliente;
        const novo: Cliente = {
          ...payload,
          id: nextIdCliente(),
          situacao: payload.situacao ?? "Ativo",
        };
        store.clientes.push(novo);
        return Promise.resolve({ data: novo } as { data: T });
      }
      if (url === "/api/inadimplentes") {
        const payload = body as Inadimplencia;
        const novo: Inadimplencia = {
          ...payload,
          id: nextIdInadimplencia(),
          status: payload.status ?? "EmAberto",
          clienteNome: getClienteNome(payload.clienteId),
        };
        store.inadimplentes.push(novo);
        return Promise.resolve({ data: novo } as { data: T });
      }

      if (url === "/api/lotes-envio-boletos") {
        const arquivos: File[] = [];
        if (body instanceof FormData) {
          for (const entry of body.getAll("arquivos")) {
            if (entry instanceof File) arquivos.push(entry);
          }
        }
        if (arquivos.length === 0) return Promise.reject(new Error("Nenhum arquivo PDF enviado."));
        const itens = arquivos.map((f, idx) => analisarArquivoMock(f.name, idx));
        const loteId = `lote-mock-${nextLoteId++}`;
        const lote: LoteEnvioBoleto = {
          loteId,
          status: "CONFERENCIA",
          criadoEm: new Date().toISOString(),
          criadoPor: getCurrentUserByToken()?.nome ?? "Usuário mock",
          quantidadeTotal: itens.length,
          quantidadeIdentificada: itens.filter((i) => i.clienteNome?.trim()).length,
          quantidadePendente: itens.filter((i) => {
            const s = String(i.status).toUpperCase();
            return s === "AGUARDANDO_CORRECAO" || s === "NAO_IDENTIFICADO" || s === "PENDENTE";
          }).length,
          itens,
          resumo: buildResumoLote(itens),
          validacao: undefined,
        };
        lote.validacao = validarLoteMock(lote);
        store.lotesEnvioBoletos.unshift(lote);
        return Promise.resolve({ data: lote, status: 201 } as { data: T; status: number });
      }

      const matchValidarLote = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/validar$/);
      if (matchValidarLote) {
        const lote = store.lotesEnvioBoletos.find((l) => l.loteId === matchValidarLote[1]);
        if (!lote) return Promise.reject(new Error("Lote não encontrado."));
        const validacao = validarLoteMock(lote);
        lote.validacao = validacao;
        lote.resumo = buildResumoLote(lote.itens ?? []);
        return Promise.resolve({
          data: { ...lote, podeEnviar: validacao.podeEnviar, bloqueios: validacao.bloqueios },
        } as { data: T });
      }

      const matchEnviarLote = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/enviar$/);
      if (matchEnviarLote) {
        const lote = store.lotesEnvioBoletos.find((l) => l.loteId === matchEnviarLote[1]);
        if (!lote) return Promise.reject(new Error("Lote não encontrado."));
        const payload = (body ?? {}) as { permitirReenvioDuplicado?: boolean; itemIds?: string[] };
        const ids = Array.isArray(payload.itemIds) && payload.itemIds.length > 0
          ? new Set(payload.itemIds)
          : new Set(
              (lote.itens ?? [])
                .filter((i) => String(i.status).toUpperCase() === "PRONTO_PARA_ENVIO")
                .map((i) => idItemEnvioBoleto(i))
            );
        if (ids.size === 0) {
          return Promise.reject(new Error("Nenhum item pronto para envio"));
        }
        for (const item of lote.itens ?? []) {
          if (!ids.has(idItemEnvioBoleto(item))) continue;
          if (String(item.status).toUpperCase() !== "PRONTO_PARA_ENVIO") continue;
          if (item.status === "DUPLICADO" && !payload.permitirReenvioDuplicado) {
            item.status = "ERRO";
            item.erro = "Boleto duplicado";
            continue;
          }
          if (!item.emailDestinatario?.trim() || item.bloqueado) {
            item.status = "ERRO";
            item.erro = item.motivoBloqueio ?? "Item bloqueado";
            continue;
          }
          if (item.nomeArquivoOriginal.toLowerCase().includes("erro")) {
            item.status = "ERRO";
            item.erro = "Falha simulada no envio";
          } else {
            item.status = "ENVIADO";
            item.erro = undefined;
          }
          item.simulado = true;
        }
        lote.status = "CONCLUIDO";
        lote.enviadoEm = new Date().toISOString();
        lote.resumo = buildResumoLote(lote.itens ?? []);
        lote.validacao = validarLoteMock(lote);
        return Promise.resolve({ data: lote } as { data: T });
      }

      if (url === "/api/pagamentos") {
        const payload = (body ?? {}) as {
          dividaId?: string;
          valorPago?: number;
          dataPagamento?: string;
          metodoPagamento?: string;
          comprovante?: string;
          confirmadoPor?: string;
        };
        const valorBruto = Number(payload.valorPago ?? 0);
        const valorPago = valorBruto >= 100 ? valorBruto / 100 : valorBruto;
        const confirmadoPor =
          payload.confirmadoPor?.trim() ||
          (payload.comprovante?.startsWith("user:") ? payload.comprovante.slice(5) : undefined) ||
          getCurrentUserByToken()?.login ||
          "mock.user";
        const pag: PagamentoInadimplencia = {
          pagamentoId: `pag-mock-${Date.now()}`,
          dividaId: payload.dividaId,
          valorPago,
          dataPagamento: payload.dataPagamento ?? new Date().toISOString().slice(0, 10),
          metodoPagamento: payload.metodoPagamento,
          comprovante: payload.comprovante ?? `user:${confirmadoPor}`,
          criadoEm: new Date().toISOString(),
          confirmadoPor,
        };
        store.pagamentos.push(pag);
        // Espelha na dívida para a listagem de inadimplentes
        if (payload.dividaId) {
          const idx = store.inadimplentes.findIndex((x) => x.id === payload.dividaId);
          if (idx >= 0) {
            const atual = store.inadimplentes[idx];
            store.inadimplentes[idx] = {
              ...atual,
              pagamentos: [...(atual.pagamentos ?? []), pag],
            };
          }
        }
        return Promise.resolve({ data: pag } as { data: T });
      }

      if (url === "/api/notificacoes/enviar-cobranca") {
        const payload = (body ?? {}) as { clienteId?: string; dividaId?: string };
        const divida = store.inadimplentes.find((i) => i.id === payload.dividaId);
        const cliente = store.clientes.find((c) => c.id === payload.clienteId);
        return Promise.resolve({
          data: {
            notificacaoId: `notif-mock-${Date.now()}`,
            clienteId: payload.clienteId,
            dividaId: payload.dividaId,
            tipo: "COBRANCA_EMAIL",
            emailDestino: cliente?.email ?? "cliente@exemplo.com",
            assunto: "Cobrança - Débito em Aberto",
            valorComunicado: divida?.valor ?? 0,
            statusEnvio: "ENVIADO",
            tentativas: 1,
            dataEnvio: new Date().toISOString(),
            cobrancaSicoobId: `bol-mock-${Date.now()}`,
            boletoLinhaDigitavel: "75691.23456 78901.234567 89012.345678 9 12340000010000",
            boletoNossoNumero: "12345678",
            boletoPdfAnexado: true,
          },
        } as { data: T });
      }

      if (url === "/api/notificacoes/enviar-aviso-pendencia") {
        const form = body as FormData;
        const clienteId =
          form instanceof FormData ? String(form.get("clienteId") ?? "") : String((body as { clienteId?: string })?.clienteId ?? "");
        const cliente = store.clientes.find((c) => c.id === clienteId);
        const email = (cliente?.email ?? "").trim();
        if (!email) {
          return Promise.resolve({
            data: {
              clienteId,
              tipo: "AVISO_PENDENCIA",
              statusEnvio: "FALHOU",
              mensagemErro: "Cliente sem e-mail cadastrado.",
            },
          } as { data: T });
        }
        return Promise.resolve({
          data: {
            notificacaoId: `aviso-mock-${Date.now()}`,
            clienteId,
            tipo: "AVISO_PENDENCIA",
            emailDestino: email,
            assunto: "Aviso de pendência",
            statusEnvio: "ENVIADO",
            tentativas: 1,
            dataEnvio: new Date().toISOString(),
          },
        } as { data: T });
      }

      const matchPix = url.match(/^\/api\/sicoob\/dividas\/([\w-]+)\/pix$/);
      if (matchPix) {
        const dividaId = matchPix[1];
        const divida = store.inadimplentes.find((i) => i.id === dividaId);
        const valorCentavos = Math.round((divida?.valor ?? 0) * 100);
        const cob: CobrancaSicoob = {
          cobrancaId: `pix-mock-${Date.now()}`,
          dividaId,
          protocoloDivida: `DIV-${dividaId}`,
          tipo: "PIX",
          status: "PENDENTE",
          valorCentavos,
          pixTxid: `TXIDMOCK${Date.now()}`,
          pixCopiaECola:
            "00020126580014br.gov.bcb.pix0136mock-chave-pix-sgi-contabilidade5204000053039865802BR5925MCA SERVICOS CONTABEIS6009SAO PAULO62070503***6304ABCD",
          pixQrCode: null,
          criadoEm: new Date().toISOString(),
        };
        store.cobrancasSicoob.push(cob);
        return Promise.resolve({ data: cob, status: 201 } as { data: T; status: number });
      }

      const matchBoleto = url.match(/^\/api\/sicoob\/dividas\/([\w-]+)\/boleto$/);
      if (matchBoleto) {
        const dividaId = matchBoleto[1];
        const divida = store.inadimplentes.find((i) => i.id === dividaId);
        const valorCentavos = Math.round((divida?.valor ?? 0) * 100);
        const cob: CobrancaSicoob = {
          cobrancaId: `bol-mock-${Date.now()}`,
          dividaId,
          protocoloDivida: `DIV-${dividaId}`,
          tipo: "BOLETO",
          status: "PENDENTE",
          valorCentavos,
          boletoNossoNumero: String(Date.now()).slice(-8),
          boletoLinhaDigitavel: "75691.23456 78901.234567 89012.345678 9 12340000010000",
          boletoCodigoBarras: "75691234567890123456789012345678912340000010000",
          criadoEm: new Date().toISOString(),
        };
        store.cobrancasSicoob.push(cob);
        return Promise.resolve({ data: cob, status: 201 } as { data: T; status: number });
      }

      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    patch<T = unknown>(url: string, body: unknown) {
      const matchStatusDoc = url.match(/^\/api\/documentos-clientes\/([\w-]+)\/status$/);
      if (matchStatusDoc) {
        const docId = matchStatusDoc[1];
        const idx = store.documentosClientes.findIndex((d) => d.documentoId === docId);
        if (idx < 0) return Promise.reject(new Error("Documento não encontrado."));
        const payload = (body ?? {}) as { status?: string };
        const novoStatus = String(payload.status ?? "RECEBIDO").toUpperCase() as DocumentoCliente["status"];
        store.documentosClientes[idx] = { ...store.documentosClientes[idx], status: novoStatus };
        syncPortalFromStaff(store.documentosClientes[idx]);
        return Promise.resolve({ data: { ...store.documentosClientes[idx] } } as { data: T });
      }
      const matchRespostaDoc = url.match(/^\/api\/documentos-clientes\/([\w-]+)\/resposta$/);
      if (matchRespostaDoc) {
        const docId = matchRespostaDoc[1];
        const idx = store.documentosClientes.findIndex((d) => d.documentoId === docId);
        if (idx < 0) return Promise.reject(new Error("Documento não encontrado."));
        const payload = (body ?? {}) as { resposta?: string };
        const resposta = String(payload.resposta ?? "").trim();
        if (!resposta) return Promise.reject(new Error("Informe a resposta ao cliente."));
        const atual = store.documentosClientes[idx];
        const atualizado: DocumentoCliente = {
          ...atual,
          respostaEscritorio: resposta,
          respondidoEm: new Date().toISOString(),
          respondidoPorNome: readAuthItem("sgi_user_display") ?? "Escritório",
          status: atual.status === "RECEBIDO" || atual.status === "ENVIADO" ? "EM_ANALISE" : atual.status,
        };
        store.documentosClientes[idx] = atualizado;
        syncPortalFromStaff(atualizado);
        return Promise.resolve({ data: { ...atualizado } } as { data: T });
      }
      const matchItemCliente = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/itens\/([\w-]+)\/cliente$/);
      if (matchItemCliente) {
        const [, loteId, itemId] = matchItemCliente;
        const lote = store.lotesEnvioBoletos.find((l) => l.loteId === loteId);
        const item = lote?.itens?.find((i) => idItemEnvioBoleto(i) === itemId);
        if (!lote || !item) return Promise.reject(new Error("Item não encontrado."));
        const payload = (body ?? {}) as { clienteId?: string };
        const cliente = store.clientes.find((c) => c.id === payload.clienteId);
        if (!cliente) return Promise.reject(new Error("Cliente não encontrado."));
        item.clienteId = cliente.id;
        item.clienteNome = cliente.nome;
        item.documentoMascarado = cliente.cpf ? `***.***.${cliente.cpf.slice(-6)}` : undefined;
        item.emailDestinatario = cliente.email;
        item.metodoIdentificacao = "MANUAL";
        item.confiancaIdentificacao = "ALTA";
        item.status = cliente.email?.trim() ? "PRONTO_PARA_ENVIO" : "AGUARDANDO_CORRECAO";
        item.bloqueado = !cliente.email?.trim();
        item.motivoBloqueio = item.bloqueado ? "Cliente sem e-mail" : undefined;
        item.motivoBloqueio = item.bloqueado ? "Cliente sem e-mail" : undefined;
        lote.resumo = buildResumoLote(lote.itens ?? []);
        lote.validacao = validarLoteMock(lote);
        return Promise.resolve({ data: item } as { data: T });
      }
      const matchItemAcao = url.match(/^\/api\/lotes-envio-boletos\/([\w-]+)\/itens\/([\w-]+)\/(confirmar|ignorar|reativar)$/);
      if (matchItemAcao) {
        const [, loteId, itemId, acao] = matchItemAcao;
        const lote = store.lotesEnvioBoletos.find((l) => l.loteId === loteId);
        const item = lote?.itens?.find((i) => idItemEnvioBoleto(i) === itemId);
        if (!lote || !item) return Promise.reject(new Error("Item não encontrado."));
        if (acao === "confirmar") {
          item.status = "PRONTO_PARA_ENVIO";
          item.bloqueado = false;
        } else if (acao === "ignorar") {
          item.status = "IGNORADO";
        } else {
          item.status = item.emailDestinatario?.trim() ? "PRONTO_PARA_ENVIO" : "AGUARDANDO_CORRECAO";
          item.bloqueado = !item.emailDestinatario?.trim();
        }
        lote.resumo = buildResumoLote(lote.itens ?? []);
        lote.validacao = validarLoteMock(lote);
        return Promise.resolve({ data: item } as { data: T });
      }

      const matchAprovarUsuario = url.match(/^\/api\/usuarios\/([\w-]+)\/aprovar(?:\?.*)?$/);
      if (matchAprovarUsuario) {
        const usuarioId = matchAprovarUsuario[1];
        const userAtual = getCurrentUserByToken();
        const perfilStorage = readAuthItem("sgi_user_profile") as PerfilUsuario | null;
        const perfilAtual = userAtual?.perfil ?? perfilStorage;
        if (perfilAtual !== "PROPRIETARIA") {
          return Promise.reject(new Error("Apenas a proprietária pode aprovar cadastros."));
        }
        const idx = store.usuarios.findIndex((u) => u.usuarioId === usuarioId);
        if (idx === -1) return Promise.reject(new Error("Usuário não encontrado."));
        const atual = store.usuarios[idx];
        const perfilQuery = url.match(/[?&]perfil=([^&]+)/)?.[1];
        const perfilDecoded = perfilQuery ? decodeURIComponent(perfilQuery).toUpperCase() : "";
        const perfilAprovado: PerfilUsuario =
          perfilDecoded === "FUNCIONARIO" || perfilDecoded === "PROPRIETARIA" || perfilDecoded === "RESPONSAVEL_FINANCEIRO"
            ? (perfilDecoded as PerfilUsuario)
            : (atual.perfil as PerfilUsuario) || "RESPONSAVEL_FINANCEIRO";
        const aprovado = { ...atual, statusUsuario: "ATIVO" as const, perfil: perfilAprovado };
        store.usuarios[idx] = aprovado;
        const { senha: _senha, ...ret } = aprovado;
        return Promise.resolve({ data: ret } as { data: T });
      }
      const matchRevogar = url.match(/^\/api\/usuarios\/([\w-]+)\/revogar$/);
      if (matchRevogar) {
        const usuarioId = matchRevogar[1];
        const userAtual = getCurrentUserByToken();
        const perfilStorage = readAuthItem("sgi_user_profile") as PerfilUsuario | null;
        const perfilAtual = userAtual?.perfil ?? perfilStorage;
        if (perfilAtual !== "PROPRIETARIA") {
          return Promise.reject(new Error("Apenas a proprietária pode revogar acessos."));
        }
        if (userAtual?.usuarioId === usuarioId) {
          return Promise.reject(new Error("Não é possível revogar o próprio acesso."));
        }
        const idx = store.usuarios.findIndex((u) => u.usuarioId === usuarioId);
        if (idx === -1) return Promise.reject(new Error("Usuário não encontrado."));
        const alvo = store.usuarios[idx];
        if (alvo.perfil === "PROPRIETARIA") {
          return Promise.reject(new Error("Não é possível revogar o acesso de outra proprietária."));
        }
        const revogado = { ...alvo, statusUsuario: "INATIVO" as const };
        store.usuarios[idx] = revogado;
        const { senha: _senha, ...ret } = revogado;
        return Promise.resolve({ data: ret } as { data: T });
      }
      const matchInad = url.match(/^\/api\/inadimplentes\/([\w-]+)$/);
      if (matchInad) {
        const id = matchInad[1];
        const payload = body as { status?: string };
        const idx = store.inadimplentes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: inadimplência ${id} não encontrada`));
        const atual = store.inadimplentes[idx];
        // Quem confirmou já veio no POST /api/pagamentos (antes do PATCH).
        const atualizado: Inadimplencia = {
          ...atual,
          status: (payload?.status as Inadimplencia["status"]) ?? atual.status,
          updatedAt: new Date().toISOString(),
        };
        store.inadimplentes[idx] = atualizado;
        return Promise.resolve({ data: atualizado } as { data: T });
      }
      const matchCliente = url.match(/^\/api\/clientes\/([\w-]+)$/);
      if (matchCliente) {
        const id = matchCliente[1];
        const payload = body as Partial<Cliente>;
        const idx = store.clientes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: cliente ${id} não encontrado`));
        const atual = store.clientes[idx];
        const atualizado: Cliente = {
          ...atual,
          ...payload,
          id: atual.id,
        };
        store.clientes[idx] = atualizado;
        return Promise.resolve({ data: atualizado } as { data: T });
      }
      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    delete(url: string) {
      const matchCliente = url.match(/^\/api\/clientes\/([\w-]+)$/);
      if (matchCliente) {
        const id = matchCliente[1];
        const idx = store.clientes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: cliente ${id} não encontrado`));
        store.clientes.splice(idx, 1);
        return Promise.resolve({ data: {} } as { data: unknown });
      }
      const matchInad = url.match(/^\/api\/inadimplentes\/([\w-]+)$/);
      if (matchInad) {
        const id = matchInad[1];
        const idx = store.inadimplentes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: inadimplência ${id} não encontrada`));
        store.inadimplentes.splice(idx, 1);
        return Promise.resolve({ data: {} } as { data: unknown });
      }
      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },
  };
}

export const isMockEnabled = () =>
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.VITE_USE_MOCK === "1";
