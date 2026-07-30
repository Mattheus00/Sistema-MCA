import type {
  ConfiancaIdentificacaoBoleto,
  ItemEnvioBoleto,
  LoteEnvioBoleto,
  StatusItemEnvioBoleto,
  ValidacaoLoteEnvioBoleto,
} from "@/types/api";

export type IndicadorStatus = {
  cor: "verde" | "amarelo" | "vermelho" | "cinza";
  texto: string;
};

export function statusItemApi(item: ItemEnvioBoleto): string {
  return String(item.status ?? "").toUpperCase();
}

export function envioBoletoIdItem(item: ItemEnvioBoleto): string {
  return item.envioBoletoId || item.itemId;
}

export function isPdfFile(file: File): boolean {
  const nome = file.name.toLowerCase();
  return file.type === "application/pdf" || nome.endsWith(".pdf");
}

export function validarArquivosPdf(arquivos: File[]): { validos: File[]; erros: string[] } {
  const validos: File[] = [];
  const erros: string[] = [];
  const vistos = new Set<string>();

  for (const arquivo of arquivos) {
    const chave = `${arquivo.name}|${arquivo.size}`;
    if (vistos.has(chave)) {
      erros.push(`Arquivo duplicado na seleção: ${arquivo.name}`);
      continue;
    }
    vistos.add(chave);

    if (!isPdfFile(arquivo)) {
      erros.push(`Apenas PDF é permitido: ${arquivo.name}`);
      continue;
    }
    if (arquivo.size <= 0) {
      erros.push(`Arquivo vazio: ${arquivo.name}`);
      continue;
    }
    validos.push(arquivo);
  }

  return { validos, erros };
}

export function formatarTamanhoArquivo(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function exibirDocumento(valor: string | undefined): string {
  return valor?.trim() ? valor.trim() : "—";
}

export function itemNaoIdentificado(item: ItemEnvioBoleto): boolean {
  const status = statusItemApi(item);
  if (status === "NAO_IDENTIFICADO") return true;
  const metodo = String(item.metodoIdentificacao ?? "").toUpperCase();
  if (metodo === "NAO_IDENTIFICADO") return true;
  return !item.clienteNome?.trim() && !item.clienteId;
}

export function itemSemEmailBloqueado(item: ItemEnvioBoleto): boolean {
  return !item.emailDestinatario?.trim() && statusItemApi(item) === "AGUARDANDO_CORRECAO";
}

export function labelMetodoIdentificacao(metodo: string | undefined): string {
  const m = (metodo ?? "").toUpperCase();
  if (m === "CODIGO_CLIENTE" || m === "CODIGO") return "Código do cliente";
  if (m === "CPF_CNPJ" || m === "CPF" || m === "CNPJ") return "CPF/CNPJ";
  if (m === "NOME_EXATO" || m === "NOME") return "Nome exato";
  if (m === "NOME_APROXIMADO") return "Nome aproximado";
  if (m === "MANUAL") return "Manual";
  if (m === "NAO_IDENTIFICADO") return "Não identificado";
  return metodo?.trim() ? metodo : "—";
}

export function labelConfianca(confianca: ConfiancaIdentificacaoBoleto | undefined): string {
  if (confianca === "ALTA") return "Alta";
  if (confianca === "MEDIA") return "Média";
  if (confianca === "BAIXA") return "Baixa";
  return "—";
}

export function labelStatusItem(status: StatusItemEnvioBoleto | string | undefined): string {
  return indicadorStatusItem({ envioBoletoId: "", itemId: "", nomeArquivoOriginal: "", status: String(status ?? "PENDENTE") as StatusItemEnvioBoleto }).texto;
}

/** Badge e texto de status — usa exclusivamente item.status da API. */
export function indicadorStatusItem(item: ItemEnvioBoleto): IndicadorStatus {
  if (itemNaoIdentificado(item)) {
    return { cor: "vermelho", texto: "Não identificado" };
  }

  const status = statusItemApi(item);

  if (status === "PRONTO_PARA_ENVIO" || status === "PRONTO") {
    return { cor: "verde", texto: "Pronto para envio" };
  }
  if (status === "AGUARDANDO_CORRECAO") {
    return { cor: "amarelo", texto: "Aguardando correção" };
  }
  if (status === "ENVIADO") {
    return { cor: "verde", texto: "Enviado" };
  }
  if (status === "ERRO") {
    return { cor: "vermelho", texto: "Erro" };
  }
  if (status === "IGNORADO") {
    return { cor: "cinza", texto: "Ignorado" };
  }
  if (status === "NAO_IDENTIFICADO") {
    return { cor: "vermelho", texto: "Não identificado" };
  }

  return { cor: "amarelo", texto: status || "—" };
}

export function exibirEmailItem(item: ItemEnvioBoleto): { texto: string; ausente: boolean } {
  const email = item.emailDestinatario?.trim();
  if (email) return { texto: email, ausente: false };
  if (itemSemEmailBloqueado(item)) {
    return { texto: "Sem e-mail", ausente: true };
  }
  return { texto: "E-mail não encontrado", ausente: true };
}

/** Elegível para envio somente quando a API marca PRONTO_PARA_ENVIO. */
export function itemProntoParaEnvio(item: ItemEnvioBoleto): boolean {
  return statusItemApi(item) === "PRONTO_PARA_ENVIO";
}

export function itemBloqueiaEnvio(item: ItemEnvioBoleto): boolean {
  return !itemProntoParaEnvio(item);
}

export function itemPrecisaConfirmacao(item: ItemEnvioBoleto): boolean {
  return statusItemApi(item) === "AGUARDANDO_CORRECAO";
}

export function itensElegiveisEnvio(itens: ItemEnvioBoleto[], selecionados: Set<string>): ItemEnvioBoleto[] {
  return itens.filter((item) => selecionados.has(envioBoletoIdItem(item)) && itemProntoParaEnvio(item));
}

export function loteTemItensProntos(itens: ItemEnvioBoleto[]): boolean {
  return itens.some((item) => itemProntoParaEnvio(item));
}

export function podeEnviarSelecionados(
  itens: ItemEnvioBoleto[],
  selecionados: Set<string>,
  _validacao?: ValidacaoLoteEnvioBoleto | null
): boolean {
  if (!loteTemItensProntos(itens)) return false;
  return itensElegiveisEnvio(itens, selecionados).length > 0;
}

export function idsProntosParaEnvio(
  itens: ItemEnvioBoleto[],
  selecionados: Set<string>,
  itemIds?: string[]
): string[] {
  const base = itemIds && itemIds.length > 0 ? itemIds : Array.from(selecionados);
  return base.filter((id) => {
    const item = itens.find((i) => envioBoletoIdItem(i) === id);
    return item != null && itemProntoParaEnvio(item);
  });
}

export function motivoBloqueioItem(
  item: ItemEnvioBoleto,
  validacao?: ValidacaoLoteEnvioBoleto | null
): string | undefined {
  const itemId = envioBoletoIdItem(item);
  const bloqueio = validacao?.bloqueios.find((b) => b.itemId === itemId);
  if (bloqueio?.motivo?.trim()) return bloqueio.motivo.trim();
  if (item.motivoBloqueio?.trim()) return item.motivoBloqueio.trim();
  if (itemSemEmailBloqueado(item)) return "Sem e-mail";
  return undefined;
}

export function itensComErroParaReenvio(itens: ItemEnvioBoleto[]): ItemEnvioBoleto[] {
  return itens.filter((item) => statusItemApi(item) === "ERRO");
}

export function todosItensSelecionaveis(itens: ItemEnvioBoleto[]): string[] {
  return itens
    .filter((item) => statusItemApi(item) === "PRONTO_PARA_ENVIO")
    .map((i) => envioBoletoIdItem(i))
    .filter(Boolean);
}

export function resumoCardsFromLote(lote: LoteEnvioBoleto | null) {
  const resumo = lote?.resumo;
  const itens = lote?.itens ?? [];
  const countPorStatus = (status: string) => itens.filter((i) => statusItemApi(i) === status).length;

  return {
    total: lote?.quantidadeTotal ?? itens.length,
    identificados: lote?.quantidadeIdentificada ?? itens.filter((i) => i.clienteNome?.trim()).length,
    pendentes: lote?.quantidadePendente ?? countPorStatus("AGUARDANDO_CORRECAO") + countPorStatus("NAO_IDENTIFICADO"),
    prontos: resumo?.prontosParaEnvio ?? countPorStatus("PRONTO_PARA_ENVIO"),
    semEmail: resumo?.semEmail ?? itens.filter((i) => itemSemEmailBloqueado(i)).length,
    pendentesCorrecao: resumo?.aguardandoCorrecao ?? countPorStatus("AGUARDANDO_CORRECAO"),
    ignorados: resumo?.ignorados ?? countPorStatus("IGNORADO"),
    enviados: resumo?.enviados ?? countPorStatus("ENVIADO"),
    erros: resumo?.erros ?? countPorStatus("ERRO"),
  };
}

export function mensagemBloqueiosValidacao(validacao?: ValidacaoLoteEnvioBoleto | null): string | null {
  if (!validacao || validacao.podeEnviar || validacao.bloqueios.length === 0) return null;
  return validacao.bloqueios.map((b) => b.motivo).filter(Boolean).join(" · ");
}
