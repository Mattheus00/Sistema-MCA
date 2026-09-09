import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { listarClientes } from "@/lib/clientesApi";
import {
  abrirPdfItem,
  atualizarClienteItem,
  confirmarItemEnvioBoleto,
  criarLoteEnvioBoletos,
  enviarLoteEnvioBoletos,
  ignorarItemEnvioBoleto,
  validarLoteEnvioBoletos,
} from "@/lib/envioBoletosApi";
import {
  envioBoletoIdItem,
  idsProntosParaEnvio,
  itensComErroParaReenvio,
  mensagemBloqueiosValidacao,
  podeEnviarSelecionados,
  resumoCardsFromLote,
  todosItensSelecionaveis,
  validarArquivosPdf,
} from "@/lib/envioBoletosUtils";
import type { Cliente, ItemEnvioBoleto, LoteEnvioBoleto } from "@/types/api";
import { STATUS_CLIENTE, STATUS_ITEM_ENVIO, statusEh } from "@/lib/constants/status";
import {
  filtrarClientesBusca,
  montarResumoConfirmacao,
  type EnvioBoletosFeedback,
  type EtapaNovo,
} from "@/hooks/envioBoletosTypes";

export function useEnvioBoletosLote({
  setLoading,
  setErro,
  setMensagemSucesso,
}: EnvioBoletosFeedback) {
  const [etapa, setEtapa] = useState<EtapaNovo>("upload");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [lote, setLote] = useState<LoteEnvioBoleto | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [dragAtivo, setDragAtivo] = useState(false);
  const [modalConfirmarEnvio, setModalConfirmarEnvio] = useState(false);
  const [permitirReenvioDuplicado, setPermitirReenvioDuplicado] = useState(false);
  const [itemCorrigir, setItemCorrigir] = useState<ItemEnvioBoleto | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);

  const itens = useMemo(() => lote?.itens ?? [], [lote?.itens]);
  const cards = useMemo(() => resumoCardsFromLote(lote), [lote]);
  const podeEnviar = podeEnviarSelecionados(itens, selecionados);
  const itensErro = itensComErroParaReenvio(itens);
  const resumoConfirmacao = useMemo(
    () => montarResumoConfirmacao(itens, selecionados),
    [itens, selecionados],
  );
  const clientesFiltrados = useMemo(
    () => filtrarClientesBusca(clientes, buscaCliente),
    [clientes, buscaCliente],
  );

  const adicionarArquivos = useCallback(
    (lista: FileList | File[]) => {
      const novos = Array.from(lista);
      setArquivos((prev) => {
        const mapa = new Map(prev.map((f) => [`${f.name}|${f.size}`, f]));
        for (const f of novos) mapa.set(`${f.name}|${f.size}`, f);
        return Array.from(mapa.values());
      });
      setErro(null);
    },
    [setErro],
  );

  const removerArquivo = (idx: number) => setArquivos((prev) => prev.filter((_, i) => i !== idx));

  const limparNovoEnvio = () => {
    setEtapa("upload");
    setArquivos([]);
    setLote(null);
    setSelecionados(new Set());
    setPermitirReenvioDuplicado(false);
    setErro(null);
    setMensagemSucesso(null);
  };

  async function enviarUpload() {
    const { validos, erros } = validarArquivosPdf(arquivos);
    if (validos.length === 0) {
      setErro(erros[0] ?? "Selecione ao menos um arquivo PDF.");
      return;
    }
    if (erros.length > 0) setErro(erros.join(" "));
    try {
      setLoading(true);
      setErro(null);
      const loteNormalizado = await criarLoteEnvioBoletos(validos);
      setLote(loteNormalizado);
      setEtapa("conferencia");
      setMensagemSucesso("Arquivos enviados. Revise a conferência antes de disparar os e-mails.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao enviar os arquivos."));
    } finally {
      setLoading(false);
    }
  }

  const loteId = lote?.loteId;

  const validarLoteAtual = useCallback(async () => {
    if (!loteId) return;
    try {
      setLoading(true);
      setErro(null);
      const atualizado = await validarLoteEnvioBoletos(loteId);
      setLote(atualizado);
      const msgBloqueios = mensagemBloqueiosValidacao(atualizado.validacao);
      if (msgBloqueios) setErro(msgBloqueios);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao validar o lote."));
    } finally {
      setLoading(false);
    }
  }, [loteId, setErro, setLoading]);

  async function executarEnvio(itemIds?: string[]) {
    if (!lote?.loteId) return;
    const ids = idsProntosParaEnvio(itens, selecionados, itemIds);
    if (ids.length === 0) {
      setErro("Nenhum item pronto para envio.");
      return;
    }
    try {
      setLoading(true);
      setErro(null);
      const atualizado = await enviarLoteEnvioBoletos(lote.loteId, {
        permitirReenvioDuplicado,
        itemIds: ids,
      });
      setLote(atualizado);
      setEtapa("resultado");
      setModalConfirmarEnvio(false);
      setMensagemSucesso("Envio processado. Confira o resultado abaixo.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao enviar os boletos."));
    } finally {
      setLoading(false);
    }
  }

  async function patchItem(itemId: string, acao: "confirmar" | "ignorar") {
    if (!lote?.loteId) return;
    try {
      setLoading(true);
      setErro(null);
      if (acao === "confirmar") {
        await confirmarItemEnvioBoleto(lote.loteId, itemId);
      } else {
        await ignorarItemEnvioBoleto(lote.loteId, itemId);
      }
      await validarLoteAtual();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao atualizar o item."));
    } finally {
      setLoading(false);
    }
  }

  async function carregarClientes(termo?: string) {
    try {
      setLoadingClientes(true);
      const list = await listarClientes({
        page: 0,
        size: 50,
        statusCliente: STATUS_CLIENTE.ATIVO,
        busca: termo?.trim() || undefined,
      });
      setClientes(list);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao buscar clientes."));
    } finally {
      setLoadingClientes(false);
    }
  }

  async function abrirModalCorrigir(item: ItemEnvioBoleto) {
    setItemCorrigir(item);
    setClienteSelecionadoId(item.clienteId ?? "");
    setBuscaCliente("");
    await carregarClientes();
  }

  async function salvarClienteCorrigido() {
    if (!lote?.loteId || !itemCorrigir || !clienteSelecionadoId) return;
    try {
      setLoading(true);
      setErro(null);
      await atualizarClienteItem(
        lote.loteId,
        envioBoletoIdItem(itemCorrigir),
        clienteSelecionadoId,
      );
      setItemCorrigir(null);
      await validarLoteAtual();
      setMensagemSucesso("Cliente atualizado no item.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao corrigir o cliente."));
    } finally {
      setLoading(false);
    }
  }

  async function visualizarPdf(itemId: string) {
    if (!lote?.loteId) return;
    try {
      setErro(null);
      await abrirPdfItem(lote.loteId, itemId);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível abrir o PDF."));
    }
  }

  function toggleItem(envioBoletoId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(envioBoletoId)) next.delete(envioBoletoId);
      else next.add(envioBoletoId);
      return next;
    });
  }

  const toggleTodos = () => {
    const ids = todosItensSelecionaveis(itens);
    if (ids.every((id) => selecionados.has(id))) setSelecionados(new Set());
    else setSelecionados(new Set(ids));
  };

  useEffect(() => {
    if (!lote?.itens) return;
    const prontos = lote.itens
      .filter((i) => statusEh(i.status, STATUS_ITEM_ENVIO.PRONTO_PARA_ENVIO))
      .map((i) => i.envioBoletoId)
      .filter(Boolean);
    setSelecionados(new Set(prontos));
  }, [lote?.loteId, lote?.itens]);

  const precisaValidarLote = etapa === "conferencia" && !!loteId && !lote?.validacao;
  useEffect(() => {
    if (precisaValidarLote) void validarLoteAtual();
  }, [precisaValidarLote, validarLoteAtual]);

  return {
    etapa,
    arquivos,
    lote,
    selecionados,
    dragAtivo,
    setDragAtivo,
    modalConfirmarEnvio,
    setModalConfirmarEnvio,
    permitirReenvioDuplicado,
    setPermitirReenvioDuplicado,
    itemCorrigir,
    setItemCorrigir,
    clientes,
    buscaCliente,
    setBuscaCliente,
    clienteSelecionadoId,
    setClienteSelecionadoId,
    loadingClientes,
    adicionarArquivos,
    removerArquivo,
    limparNovoEnvio,
    enviarUpload,
    validarLoteAtual,
    executarEnvio,
    patchItem,
    abrirModalCorrigir,
    carregarClientes,
    salvarClienteCorrigido,
    visualizarPdf,
    toggleItem,
    toggleTodos,
    itens,
    cards,
    podeEnviar,
    itensErro,
    resumoConfirmacao,
    clientesFiltrados,
  };
}
