import ClienteFormModal from "@/components/clientes/ClienteFormModal";
import ClientesFiltros from "@/components/clientes/ClientesFiltros";
import ClientesHeader from "@/components/clientes/ClientesHeader";
import ClientesTabela from "@/components/clientes/ClientesTabela";
import ModalExcluirCliente from "@/components/clientes/ModalExcluirCliente";
import { useClientes } from "@/hooks/useClientes";
import "@/styles/pages/clientes.css";

export default function WebClientes() {
  const {
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
  } = useClientes();

  return (
    <div className="page-clientes">
      <ClientesHeader
        loading={loading}
        gerarRelatorioExcel={gerarRelatorioExcel}
        abrirModalNovo={abrirModalNovo}
      />

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-clientes__erro">{erro}</p>}

      <ClientesFiltros
        busca={busca}
        setBusca={setBusca}
        filtroSituacao={filtroSituacao}
        setFiltroSituacao={setFiltroSituacao}
        setPagina={setPagina}
      />

      <ClientesTabela
        loading={loading}
        ordenados={ordenados}
        itensPagina={itensPagina}
        filtroSituacao={filtroSituacao}
        podeExcluirCliente={podeExcluirCliente}
        itensPorPagina={itensPorPagina}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        setPagina={setPagina}
        toggleOrdenacao={toggleOrdenacao}
        abrirModalEditar={abrirModalEditar}
        setClienteParaExcluir={setClienteParaExcluir}
      />

      {clienteParaExcluir && (
        <ModalExcluirCliente
          clienteParaExcluir={clienteParaExcluir}
          setClienteParaExcluir={setClienteParaExcluir}
          excluir={excluir}
        />
      )}

      {modalAberto && (
        <ClienteFormModal
          clienteEmEdicao={clienteEmEdicao}
          form={form}
          setForm={setForm}
          setModalAberto={setModalAberto}
          setClienteEmEdicao={setClienteEmEdicao}
          criar={criar}
          atualizar={atualizar}
        />
      )}
    </div>
  );
}
