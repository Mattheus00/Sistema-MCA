import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage, getAuthUserProfile, isMockEnabled } from "@/lib/api";
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarTodosClientes,
} from "@/lib/clientesApi";
import { exportarRelatorioClientesExcel } from "@/lib/relatorioClientes";
import { STATUS_CLIENTE } from "@/lib/constants/status";
import type { Cliente } from "@/types/api";
import {
  FORM_VAZIO,
  ITENS_POR_PAGINA_CLIENTES,
  compareCodigo,
  filtrarClientesPorTermoMock,
  formatCelular,
  formatCpf,
  isValidEmail,
  type FiltroSituacaoCliente,
  type OrdenarClientesPor,
} from "@/hooks/clientesTypes";

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacaoCliente>(STATUS_CLIENTE.ATIVO);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<OrdenarClientesPor | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = ITENS_POR_PAGINA_CLIENTES;
  const buscaDebounceRef = useRef(false);
  const podeExcluirCliente = getAuthUserProfile() !== "FUNCIONARIO";

  const [form, setForm] = useState<Cliente>({ ...FORM_VAZIO });

  const listar = useCallback(
    async (termoBusca?: string, status: FiltroSituacaoCliente = filtroSituacao) => {
      try {
        setLoading(true);
        setErro(null);
        const termo = termoBusca?.trim();
        let list = await listarTodosClientes(termo, status);
        if (isMockEnabled() && termo) {
          list = filtrarClientesPorTermoMock(list, termo);
        }
        setClientes(list);
      } catch (e: unknown) {
        setErro(getApiErrorMessage(e, "Falha ao buscar clientes"));
      } finally {
        setLoading(false);
      }
    },
    [filtroSituacao],
  );

  // Refs com o valor mais recente, para efeitos que não devem reagir a essas mudanças.
  const buscaRef = useRef(busca);
  useEffect(() => {
    buscaRef.current = busca;
  }, [busca]);
  const listarRef = useRef(listar);
  useEffect(() => {
    listarRef.current = listar;
  }, [listar]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  async function criar() {
    if (!form.nome?.trim()) return setErro("Nome é obrigatório");
    if (!isValidEmail(form.email ?? "")) return setErro("E-mail inválido.");
    setErro(null);
    try {
      const novoCliente = await criarCliente(form);
      setClientes((prev) => [novoCliente, ...prev.filter((c) => c.id !== novoCliente.id)]);
      setForm({ ...FORM_VAZIO });
      setModalAberto(false);
      setClienteEmEdicao(null);
      setMensagemSucesso("Cliente cadastrado com sucesso.");
      await listar(busca.trim() || undefined);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao criar cliente"));
    }
  }

  function abrirModalNovo() {
    setClienteEmEdicao(null);
    setForm({ ...FORM_VAZIO });
    setModalAberto(true);
  }

  function abrirModalEditar(c: Cliente) {
    setClienteEmEdicao(c);
    setForm({
      ...c,
      codigo: c.codigo ?? "",
      nome: c.nome,
      email: c.email ?? "",
      cpf: formatCpf(c.cpf) === "—" ? "" : formatCpf(c.cpf),
      celular: formatCelular(c.celular) === "—" ? "" : formatCelular(c.celular),
      endereco: c.endereco ?? "",
      situacao: c.situacao ?? "Ativo",
    });
    setModalAberto(true);
  }

  async function atualizar() {
    if (!clienteEmEdicao?.id) return;
    if (!form.nome?.trim()) return setErro("Nome é obrigatório");
    if (!isValidEmail(form.email ?? "")) return setErro("E-mail inválido.");
    setErro(null);
    try {
      await atualizarCliente(clienteEmEdicao.id, form);
      setForm({ ...FORM_VAZIO });
      setModalAberto(false);
      setClienteEmEdicao(null);
      setMensagemSucesso("Cliente atualizado com sucesso.");
      await listar(busca.trim() || undefined);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao atualizar cliente"));
    }
  }

  async function excluir(c: Cliente) {
    if (c.id == null) return;
    try {
      setErro(null);
      await excluirCliente(c.id);
      setClienteParaExcluir(null);
      setClientes((prev) => prev.filter((item) => item.id !== c.id));
      setMensagemSucesso("Cliente excluído com sucesso.");
      await listar(busca.trim() || undefined);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao excluir cliente"));
    }
  }

  // Carrega ao montar e sempre que o filtro de situação muda (listar depende de filtroSituacao).
  useEffect(() => {
    void listar(buscaRef.current.trim() || undefined);
    setPagina(1);
  }, [listar]);

  // Busca com debounce; ignora a primeira renderização (já coberta pelo efeito acima).
  useEffect(() => {
    if (!buscaDebounceRef.current) {
      buscaDebounceRef.current = true;
      return;
    }
    const termo = busca.trim();
    const t = setTimeout(() => {
      void listarRef.current(termo || undefined);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const ordenados = [...clientes].sort((a, b) => {
    if (!ordenarPor) return 0;
    const mul = ordemAsc ? 1 : -1;
    if (ordenarPor === "codigo") return compareCodigo(a.codigo, b.codigo, mul);
    if (ordenarPor === "nome") return mul * (a.nome.localeCompare(b.nome) || 0);
    if (ordenarPor === "cpf") return mul * (a.cpf || "").localeCompare(b.cpf || "");
    return 0;
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPagina = ordenados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina,
  );

  useEffect(() => {
    if (pagina > totalPaginas && totalPaginas >= 1) setPagina(1);
  }, [ordenados.length, totalPaginas, pagina]);

  function toggleOrdenacao(campo: OrdenarClientesPor) {
    if (ordenarPor === campo) setOrdemAsc((x) => !x);
    else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  }

  function gerarRelatorioExcel() {
    if (ordenados.length === 0) {
      setErro("Não há clientes para exportar.");
      return;
    }
    setErro(null);
    exportarRelatorioClientesExcel(ordenados, {
      busca,
      situacao: filtroSituacao === STATUS_CLIENTE.INATIVO ? "inativo" : "ativo",
    });
    setMensagemSucesso("Relatório exportado. Abra o arquivo no Excel.");
  }

  return {
    loading,
    erro,
    mensagemSucesso,
    busca,
    setBusca,
    filtroSituacao,
    setFiltroSituacao,
    modalAberto,
    setModalAberto,
    clienteEmEdicao,
    setClienteEmEdicao,
    clienteParaExcluir,
    setClienteParaExcluir,
    pagina,
    setPagina,
    itensPorPagina,
    podeExcluirCliente,
    form,
    setForm,
    criar,
    abrirModalNovo,
    abrirModalEditar,
    atualizar,
    excluir,
    ordenados,
    totalPaginas,
    paginaAtual,
    itensPagina,
    toggleOrdenacao,
    gerarRelatorioExcel,
  };
}
