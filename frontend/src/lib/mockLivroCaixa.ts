type MockCategoria = { id: string; nome: string; tipo: "ENTRADA" | "SAIDA"; ativa: boolean };
type MockConta = { id: string; nome: string; ativa: boolean };
type MockAnexo = { id: string; nomeArquivo: string; tamanhoBytes: number; contentType: string; enviadoEm: string };
type MockHistorico = { id: string; dataHora: string; usuario: string; acao: string; detalhes?: string };
type MockMovimentacao = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  descricao: string;
  valor: number;
  categoriaId: string;
  categoriaNome: string;
  formaPagamento?: string;
  status: "PREVISTO" | "RECEBIDO" | "PAGO" | "CANCELADO";
  dataMovimentacao: string;
  dataVencimento?: string;
  dataPagamento?: string;
  vencido: boolean;
  proximoVencimento: boolean;
  editavel: boolean;
  clienteId?: string;
  clienteNome?: string;
  contaId?: string;
  contaNome?: string;
  observacao?: string;
  fornecedor?: string;
  origem: string;
  anexos: MockAnexo[];
  historico: MockHistorico[];
  criadoEm: string;
  atualizadoEm: string;
};

const hoje = new Date().toISOString().slice(0, 10);

export const mockLivroCaixaStore = {
  categorias: [
    { id: "lc-cat-1", nome: "Honorários contábeis", tipo: "ENTRADA", ativa: true },
    { id: "lc-cat-2", nome: "Receitas diversas", tipo: "ENTRADA", ativa: true },
    { id: "lc-cat-3", nome: "Despesas operacionais", tipo: "SAIDA", ativa: true },
    { id: "lc-cat-4", nome: "Impostos", tipo: "SAIDA", ativa: true },
  ] as MockCategoria[],
  contas: [
    { id: "lc-conta-1", nome: "Conta corrente", ativa: true },
    { id: "lc-conta-2", nome: "Caixa físico", ativa: true },
  ] as MockConta[],
  movimentacoes: [
    {
      id: "lc-mov-1",
      tipo: "ENTRADA",
      descricao: "Honorários cliente Silva",
      valor: 2500,
      categoriaId: "lc-cat-1",
      categoriaNome: "Honorários contábeis",
      formaPagamento: "PIX",
      status: "RECEBIDO",
      dataMovimentacao: hoje,
      dataPagamento: hoje,
      vencido: false,
      proximoVencimento: false,
      editavel: false,
      contaId: "lc-conta-1",
      contaNome: "Conta corrente",
      origem: "MANUAL",
      anexos: [],
      historico: [{ id: "h1", dataHora: `${hoje}T10:00:00`, usuario: "Mock", acao: "Criação", detalhes: "Lançamento manual" }],
      criadoEm: `${hoje}T10:00:00`,
      atualizadoEm: `${hoje}T10:00:00`,
    },
    {
      id: "lc-mov-2",
      tipo: "SAIDA",
      descricao: "Aluguel escritório",
      valor: 1800,
      categoriaId: "lc-cat-3",
      categoriaNome: "Despesas operacionais",
      formaPagamento: "BOLETO",
      status: "PREVISTO",
      dataMovimentacao: hoje,
      dataVencimento: hoje,
      vencido: true,
      proximoVencimento: false,
      editavel: true,
      fornecedor: "Imobiliária Central",
      origem: "MANUAL",
      anexos: [],
      historico: [{ id: "h2", dataHora: `${hoje}T09:00:00`, usuario: "Mock", acao: "Criação" }],
      criadoEm: `${hoje}T09:00:00`,
      atualizadoEm: `${hoje}T09:00:00`,
    },
    {
      id: "lc-mov-3",
      tipo: "ENTRADA",
      descricao: "Recebimento pendente",
      valor: 950,
      categoriaId: "lc-cat-2",
      categoriaNome: "Receitas diversas",
      status: "PREVISTO",
      dataMovimentacao: hoje,
      dataVencimento: hoje,
      vencido: false,
      proximoVencimento: true,
      editavel: true,
      origem: "INADIMPLENCIA",
      anexos: [],
      historico: [],
      criadoEm: `${hoje}T08:00:00`,
      atualizadoEm: `${hoje}T08:00:00`,
    },
  ] as MockMovimentacao[],
};

let nextMovId = 10;
let nextCatId = 10;
let nextContaId = 10;

function dashboardMock() {
  const entradasMes = mockLivroCaixaStore.movimentacoes
    .filter((m) => m.tipo === "ENTRADA" && (m.status === "RECEBIDO" || m.status === "PREVISTO"))
    .reduce((s, m) => s + m.valor, 0);
  const saidasMes = mockLivroCaixaStore.movimentacoes
    .filter((m) => m.tipo === "SAIDA" && (m.status === "PAGO" || m.status === "PREVISTO"))
    .reduce((s, m) => s + m.valor, 0);
  const realizadoEntradas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "ENTRADA" && m.status === "RECEBIDO").reduce((s, m) => s + m.valor, 0);
  const realizadoSaidas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "SAIDA" && m.status === "PAGO").reduce((s, m) => s + m.valor, 0);
  const previstoEntradas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "ENTRADA" && m.status === "PREVISTO").reduce((s, m) => s + m.valor, 0);
  const previstoSaidas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "SAIDA" && m.status === "PREVISTO").reduce((s, m) => s + m.valor, 0);
  return {
    saldoRealizado: realizadoEntradas - realizadoSaidas,
    saldoPrevisto: realizadoEntradas + previstoEntradas - realizadoSaidas - previstoSaidas,
    entradasMes,
    saidasMes,
    resultadoMes: entradasMes - saidasMes,
  };
}

function filtrarMovimentacoes(params: Record<string, unknown>) {
  let list = [...mockLivroCaixaStore.movimentacoes];
  if (params.tipo) list = list.filter((m) => m.tipo === params.tipo);
  if (params.status) list = list.filter((m) => m.status === params.status);
  if (params.categoriaId) list = list.filter((m) => m.categoriaId === params.categoriaId);
  if (params.contaId) list = list.filter((m) => m.contaId === params.contaId);
  if (params.busca) {
    const b = String(params.busca).toLowerCase();
    list = list.filter((m) => m.descricao.toLowerCase().includes(b));
  }
  return list;
}

function paginar<T>(list: T[], page: number, size: number) {
  const start = page * size;
  return {
    content: list.slice(start, start + size),
    totalElements: list.length,
    totalPages: Math.max(1, Math.ceil(list.length / size)),
    number: page,
    size,
  };
}

function getMov(id: string) {
  return mockLivroCaixaStore.movimentacoes.find((m) => m.id === id);
}

function getCat(id: string) {
  return mockLivroCaixaStore.categorias.find((c) => c.id === id);
}

function getConta(id: string) {
  return mockLivroCaixaStore.contas.find((c) => c.id === id);
}

export function mockLivroCaixaGet(url: string, params: Record<string, unknown> = {}): unknown | null {
  if (url === "/api/livro-caixa/dashboard") return dashboardMock();
  if (url === "/api/livro-caixa/movimentacoes") {
    const page = Number(params.page ?? 0);
    const size = Number(params.size ?? 20);
    return paginar(filtrarMovimentacoes(params), page, size);
  }
  const matchMov = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)$/);
  if (matchMov) return getMov(matchMov[1]) ?? null;
  const matchAnexo = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)\/anexos\/([\w-]+)$/);
  if (matchAnexo) {
    const mov = getMov(matchAnexo[1]);
    const anexo = mov?.anexos.find((a) => a.id === matchAnexo[2]);
    return anexo ? new Blob([`Mock: ${anexo.nomeArquivo}`], { type: anexo.contentType }) : null;
  }
  if (url === "/api/livro-caixa/categorias") return mockLivroCaixaStore.categorias;
  if (url === "/api/livro-caixa/contas") return mockLivroCaixaStore.contas;
  if (url === "/api/livro-caixa/analise") {
    const entradas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.valor, 0);
    const saidas = mockLivroCaixaStore.movimentacoes.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.valor, 0);
    return {
      entradasSaidasMensal: [{ mes: hoje.slice(0, 7), entradas, saidas }],
      despesasPorCategoria: mockLivroCaixaStore.categorias
        .filter((c) => c.tipo === "SAIDA")
        .map((c) => ({
          categoriaId: c.id,
          categoriaNome: c.nome,
          valor: mockLivroCaixaStore.movimentacoes.filter((m) => m.categoriaId === c.id).reduce((s, m) => s + m.valor, 0),
        })),
      fluxoCaixa: { saldoInicial: 5000, totalEntradas: entradas, totalSaidas: saidas, saldoFinal: 5000 + entradas - saidas },
    };
  }
  if (url === "/api/livro-caixa/relatorio") {
    const movs = filtrarMovimentacoes(params);
    const entradas = movs.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.valor, 0);
    const saidas = movs.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.valor, 0);
    return {
      dataInicio: String(params.dataInicio ?? hoje),
      dataFim: String(params.dataFim ?? hoje),
      saldoInicial: 5000,
      totalEntradas: entradas,
      totalSaidas: saidas,
      saldoFinal: 5000 + entradas - saidas,
      movimentacoes: movs,
      porCategoria: mockLivroCaixaStore.categorias.map((c) => ({
        categoriaNome: c.nome,
        entradas: movs.filter((m) => m.categoriaId === c.id && m.tipo === "ENTRADA").reduce((s, m) => s + m.valor, 0),
        saidas: movs.filter((m) => m.categoriaId === c.id && m.tipo === "SAIDA").reduce((s, m) => s + m.valor, 0),
      })),
    };
  }
  return null;
}

export function mockLivroCaixaMutate(method: string, url: string, body: unknown): unknown | null {
  const matchReceber = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)\/receber$/);
  if (matchReceber && method === "PATCH") {
    const mov = getMov(matchReceber[1]);
    if (!mov) return null;
    const payload = body as Record<string, unknown>;
    mov.status = "RECEBIDO";
    mov.dataPagamento = String(payload.dataPagamento ?? hoje);
    mov.editavel = false;
    mov.atualizadoEm = new Date().toISOString();
    return mov;
  }
  const matchPagar = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)\/pagar$/);
  if (matchPagar && method === "PATCH") {
    const mov = getMov(matchPagar[1]);
    if (!mov) return null;
    const payload = body as Record<string, unknown>;
    mov.status = "PAGO";
    mov.dataPagamento = String(payload.dataPagamento ?? hoje);
    mov.editavel = false;
    mov.atualizadoEm = new Date().toISOString();
    return mov;
  }
  const matchCancelar = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)\/cancelar$/);
  if (matchCancelar && method === "PATCH") {
    const mov = getMov(matchCancelar[1]);
    if (!mov) return null;
    mov.status = "CANCELADO";
    mov.editavel = false;
    return mov;
  }
  const matchMovPut = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)$/);
  if (matchMovPut && method === "PUT") {
    const mov = getMov(matchMovPut[1]);
    if (!mov || !mov.editavel) return null;
    const payload = body as Record<string, unknown>;
    Object.assign(mov, payload);
    if (payload.categoriaId) {
      mov.categoriaNome = getCat(String(payload.categoriaId))?.nome ?? mov.categoriaNome;
    }
    if (payload.contaId) {
      mov.contaNome = getConta(String(payload.contaId))?.nome;
    }
    mov.atualizadoEm = new Date().toISOString();
    return mov;
  }
  if (url === "/api/livro-caixa/movimentacoes" && method === "POST") {
    const payload = body as Record<string, unknown>;
    const cat = getCat(String(payload.categoriaId));
    const conta = payload.contaId ? getConta(String(payload.contaId)) : undefined;
    const mov: MockMovimentacao = {
      id: `lc-mov-${nextMovId++}`,
      tipo: String(payload.tipo) as "ENTRADA" | "SAIDA",
      descricao: String(payload.descricao ?? ""),
      valor: Number(payload.valor ?? 0),
      categoriaId: String(payload.categoriaId),
      categoriaNome: cat?.nome ?? "—",
      status: String(payload.status ?? "PREVISTO") as MockMovimentacao["status"],
      dataMovimentacao: String(payload.dataMovimentacao ?? hoje),
      dataVencimento: payload.dataVencimento ? String(payload.dataVencimento) : undefined,
      dataPagamento: payload.dataPagamento ? String(payload.dataPagamento) : undefined,
      formaPagamento: payload.formaPagamento ? String(payload.formaPagamento) : undefined,
      contaId: conta?.id,
      contaNome: conta?.nome,
      vencido: false,
      proximoVencimento: false,
      editavel: true,
      origem: "MANUAL",
      anexos: [],
      historico: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    mockLivroCaixaStore.movimentacoes.unshift(mov);
    return mov;
  }
  const matchAnexoPost = url.match(/^\/api\/livro-caixa\/movimentacoes\/([\w-]+)\/anexos$/);
  if (matchAnexoPost && method === "POST") return getMov(matchAnexoPost[1]);
  if (url === "/api/livro-caixa/categorias" && method === "POST") {
    const payload = body as Record<string, unknown>;
    const cat: MockCategoria = {
      id: `lc-cat-${nextCatId++}`,
      nome: String(payload.nome ?? ""),
      tipo: String(payload.tipo) as "ENTRADA" | "SAIDA",
      ativa: true,
    };
    mockLivroCaixaStore.categorias.push(cat);
    return cat;
  }
  const matchCatPut = url.match(/^\/api\/livro-caixa\/categorias\/([\w-]+)$/);
  if (matchCatPut && method === "PUT") {
    const cat = getCat(matchCatPut[1]);
    if (!cat) return null;
    const payload = body as Record<string, unknown>;
    cat.nome = String(payload.nome ?? cat.nome);
    cat.tipo = String(payload.tipo ?? cat.tipo) as "ENTRADA" | "SAIDA";
    return cat;
  }
  const matchCatDes = url.match(/^\/api\/livro-caixa\/categorias\/([\w-]+)\/desativar$/);
  if (matchCatDes && method === "PATCH") {
    const cat = getCat(matchCatDes[1]);
    if (cat) cat.ativa = false;
    return { ok: true };
  }
  if (url === "/api/livro-caixa/contas" && method === "POST") {
    const payload = body as Record<string, unknown>;
    const conta: MockConta = { id: `lc-conta-${nextContaId++}`, nome: String(payload.nome ?? ""), ativa: true };
    mockLivroCaixaStore.contas.push(conta);
    return conta;
  }
  const matchContaPut = url.match(/^\/api\/livro-caixa\/contas\/([\w-]+)$/);
  if (matchContaPut && method === "PUT") {
    const conta = getConta(matchContaPut[1]);
    if (!conta) return null;
    conta.nome = String((body as Record<string, unknown>).nome ?? conta.nome);
    return conta;
  }
  const matchContaDes = url.match(/^\/api\/livro-caixa\/contas\/([\w-]+)\/desativar$/);
  if (matchContaDes && method === "PATCH") {
    const conta = getConta(matchContaDes[1]);
    if (conta) conta.ativa = false;
    return { ok: true };
  }
  return null;
}
