import { Link } from "react-router-dom";
import HonorariosHeader from "@/components/inadimplentes/HonorariosHeader";
import HonorariosResumo from "@/components/inadimplentes/HonorariosResumo";
import ListaHonorarios from "@/components/inadimplentes/ListaHonorarios";
import ModalCancelarHonorario from "@/components/inadimplentes/ModalCancelarHonorario";
import ModalCobrancaCanal from "@/components/inadimplentes/ModalCobrancaCanal";
import ModalPagamento from "@/components/inadimplentes/ModalPagamento";
import ModalPdfConsolidado from "@/components/inadimplentes/ModalPdfConsolidado";
import { telefoneClienteHonorarios } from "@/hooks/honorariosClienteActions";
import { useHonorariosCliente } from "@/hooks/useHonorariosCliente";

export default function WebInadimplentesHonorarios() {
  const {
    clienteId,
    navigate,
    itens,
    cliente,
    loading,
    erro,
    mensagemSucesso,
    inadimplenciaParaCancelar,
    setInadimplenciaParaCancelar,
    modalPagamento,
    setModalPagamento,
    salvandoPagamento,
    modalCobrancaCanal,
    setModalCobrancaCanal,
    loadingCobrancaCanal,
    modalPdfConsolidado,
    gerandoPdfConsolidado,
    setPagina,
    itensPorPagina,
    nomeCliente,
    emailClienteValido,
    abrirModalPagamento,
    salvarPagamentoModal,
    executarCancelamento,
    abrirCobrancaPorEmail,
    enviarCobrancaPorWhatsApp,
    fecharModalCobrancaCanal,
    abrirModalPdfConsolidado,
    fecharModalPdfConsolidado,
    baixarPdfTodasCobrancas,
    enviarPdfTodasCobrancasPorEmail,
    totalEmAberto,
    qtdEmAberto,
    maiorAtraso,
    totalPaginasHonorarios,
    paginaAtualHonorarios,
    itensPaginaHonorarios,
  } = useHonorariosCliente();

  if (!clienteId) {
    return (
      <div className="page-inadimplentes page-inadimplentes--honorarios">
        <p className="page-inadimplentes__erro">Cliente não informado.</p>
        <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar-link">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="page-inadimplentes page-inadimplentes--honorarios">
      <HonorariosHeader cliente={cliente} nomeCliente={nomeCliente} />

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-inadimplentes__erro">{erro}</p>}

      <HonorariosResumo
        loading={loading}
        qtdEmAberto={qtdEmAberto}
        totalEmAberto={totalEmAberto}
        maiorAtraso={maiorAtraso}
      />

      <ListaHonorarios
        loading={loading}
        itens={itens}
        itensPaginaHonorarios={itensPaginaHonorarios}
        itensPorPagina={itensPorPagina}
        paginaAtualHonorarios={paginaAtualHonorarios}
        totalPaginasHonorarios={totalPaginasHonorarios}
        totalEmAberto={totalEmAberto}
        qtdEmAberto={qtdEmAberto}
        gerandoPdfConsolidado={gerandoPdfConsolidado}
        setPagina={setPagina}
        navigate={navigate}
        abrirModalPdfConsolidado={abrirModalPdfConsolidado}
        handlers={{
          abrirModalPagamento,
          onCobrar: (i) => setModalCobrancaCanal({ inadimplencia: i }),
          onCancelar: (i) => setInadimplenciaParaCancelar({ item: i, nomeCliente }),
        }}
      />

      {modalPdfConsolidado && (
        <ModalPdfConsolidado
          nomeCliente={nomeCliente}
          qtdEmAberto={qtdEmAberto}
          emailCliente={emailClienteValido()}
          gerandoPdfConsolidado={gerandoPdfConsolidado}
          fecharModalPdfConsolidado={fecharModalPdfConsolidado}
          baixarPdfTodasCobrancas={baixarPdfTodasCobrancas}
          enviarPdfTodasCobrancasPorEmail={enviarPdfTodasCobrancasPorEmail}
        />
      )}

      {modalCobrancaCanal && (
        <ModalCobrancaCanal
          nomeCliente={nomeCliente}
          inadimplencia={modalCobrancaCanal.inadimplencia}
          loadingCobrancaCanal={loadingCobrancaCanal}
          emailCliente={emailClienteValido()}
          telefone={telefoneClienteHonorarios(cliente)}
          abrirCobrancaPorEmail={abrirCobrancaPorEmail}
          enviarCobrancaPorWhatsApp={enviarCobrancaPorWhatsApp}
          fecharModalCobrancaCanal={fecharModalCobrancaCanal}
        />
      )}

      {inadimplenciaParaCancelar && (
        <ModalCancelarHonorario
          inadimplenciaParaCancelar={inadimplenciaParaCancelar}
          onFechar={() => setInadimplenciaParaCancelar(null)}
          onConfirmar={executarCancelamento}
        />
      )}

      {modalPagamento && (
        <ModalPagamento
          modalPagamento={modalPagamento}
          salvandoPagamento={salvandoPagamento}
          setModalPagamento={setModalPagamento}
          salvarPagamentoModal={salvarPagamentoModal}
        />
      )}
    </div>
  );
}
