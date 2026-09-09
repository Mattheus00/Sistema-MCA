import { useEffect, useState } from "react";
import ConferenciaTabela from "@/components/envio-boletos/ConferenciaTabela";
import ConfirmarEnvioModal from "@/components/envio-boletos/ConfirmarEnvioModal";
import CorrigirItemModal from "@/components/envio-boletos/CorrigirItemModal";
import HistoricoLotes from "@/components/envio-boletos/HistoricoLotes";
import ResultadoEnvioModal from "@/components/envio-boletos/ResultadoEnvioModal";
import ResultadoStep from "@/components/envio-boletos/ResultadoStep";
import UploadStep from "@/components/envio-boletos/UploadStep";
import type { AbaPrincipal, EtapaNovo } from "@/hooks/envioBoletosTypes";
import { useEnvioBoletosLote } from "@/hooks/useEnvioBoletosLote";
import { useHistoricoLotes } from "@/hooks/useHistoricoLotes";
import "@/styles/pages/envio-boletos.css";

export default function WebEnvioBoletos() {
  const [aba, setAba] = useState<AbaPrincipal>("novo");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const feedback = { loading, setLoading, erro, setErro, mensagemSucesso, setMensagemSucesso };

  const {
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
  } = useEnvioBoletosLote(feedback);

  const {
    historico,
    historicoPagina,
    historicoTotalPaginas,
    filtroStatus,
    setFiltroStatus,
    filtroDataInicio,
    setFiltroDataInicio,
    filtroDataFim,
    setFiltroDataFim,
    resultadoHistorico,
    setResultadoHistorico,
    carregarHistorico,
    abrirDetalheHistorico,
  } = useHistoricoLotes(feedback, aba);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 5000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  return (
    <div
      className={`page-envio-boletos${aba === "novo" && etapa === "conferencia" ? " page-envio-boletos--conferencia" : ""}`}
    >
      <header
        className={`page-envio-boletos__header ${etapa === "conferencia" && aba === "novo" ? "page-envio-boletos__header--compacto" : ""}`}
      >
        {!(aba === "novo" && etapa === "conferencia") && (
          <div>
            <h1 className="page-envio-boletos__title">Envio de boletos</h1>
            <p className="page-envio-boletos__subtitle">
              Envie boletos em PDF por e-mail com conferência antes do disparo.
            </p>
          </div>
        )}
        {aba === "novo" && etapa !== "upload" && (
          <button type="button" className="btn btn--secondary" onClick={limparNovoEnvio}>
            Novo lote
          </button>
        )}
      </header>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-envio-boletos__erro">{erro}</p>}

      <div
        className="page-envio-boletos__abas"
        role="tablist"
        aria-label="Seções do envio de boletos"
      >
        <button
          type="button"
          role="tab"
          aria-selected={aba === "novo"}
          className={`page-envio-boletos__aba ${aba === "novo" ? "page-envio-boletos__aba--ativa" : ""}`}
          onClick={() => setAba("novo")}
        >
          Novo envio
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "historico"}
          className={`page-envio-boletos__aba ${aba === "historico" ? "page-envio-boletos__aba--ativa" : ""}`}
          onClick={() => setAba("historico")}
        >
          Histórico
        </button>
      </div>

      {aba === "novo" && (
        <>
          <div className="page-envio-boletos__stepper" aria-label="Etapas do envio">
            {(["upload", "conferencia", "resultado"] as EtapaNovo[]).map((e, i) => {
              const labels = ["Upload", "Conferência", "Resultado"];
              const concluida =
                (etapa === "conferencia" && e === "upload") ||
                (etapa === "resultado" && (e === "upload" || e === "conferencia"));
              const ativa = etapa === e;
              return (
                <div key={e} className="page-envio-boletos__stepper-item">
                  {i > 0 && (
                    <span
                      className={`page-envio-boletos__stepper-line ${concluida || ativa ? "page-envio-boletos__stepper-line--ativa" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`page-envio-boletos__step ${ativa ? "page-envio-boletos__step--ativa" : ""} ${concluida ? "page-envio-boletos__step--concluida" : ""}`}
                  >
                    <span className="page-envio-boletos__step-num">{i + 1}</span>
                    <span className="page-envio-boletos__step-label">{labels[i]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {etapa === "upload" && (
            <UploadStep
              dragAtivo={dragAtivo}
              setDragAtivo={setDragAtivo}
              arquivos={arquivos}
              loading={loading}
              adicionarArquivos={adicionarArquivos}
              removerArquivo={removerArquivo}
              enviarUpload={enviarUpload}
            />
          )}

          {etapa === "conferencia" && lote && (
            <ConferenciaTabela
              lote={lote}
              itens={itens}
              cards={cards}
              selecionados={selecionados}
              loading={loading}
              podeEnviar={podeEnviar}
              toggleItem={toggleItem}
              toggleTodos={toggleTodos}
              visualizarPdf={visualizarPdf}
              abrirModalCorrigir={abrirModalCorrigir}
              patchItem={patchItem}
              validarLoteAtual={validarLoteAtual}
              onEnviar={() => setModalConfirmarEnvio(true)}
            />
          )}

          {etapa === "resultado" && lote && (
            <ResultadoStep
              lote={lote}
              itens={itens}
              cards={cards}
              itensErro={itensErro}
              loading={loading}
              limparNovoEnvio={limparNovoEnvio}
              executarEnvio={executarEnvio}
              setErro={setErro}
            />
          )}
        </>
      )}

      {aba === "historico" && (
        <HistoricoLotes
          filtroDataInicio={filtroDataInicio}
          filtroDataFim={filtroDataFim}
          filtroStatus={filtroStatus}
          setFiltroDataInicio={setFiltroDataInicio}
          setFiltroDataFim={setFiltroDataFim}
          setFiltroStatus={setFiltroStatus}
          carregarHistorico={carregarHistorico}
          abrirDetalheHistorico={abrirDetalheHistorico}
          historico={historico}
          historicoPagina={historicoPagina}
          historicoTotalPaginas={historicoTotalPaginas}
          loading={loading}
        />
      )}

      {modalConfirmarEnvio && (
        <ConfirmarEnvioModal
          loading={loading}
          resumoConfirmacao={resumoConfirmacao}
          permitirReenvioDuplicado={permitirReenvioDuplicado}
          setPermitirReenvioDuplicado={setPermitirReenvioDuplicado}
          setModalConfirmarEnvio={setModalConfirmarEnvio}
          executarEnvio={executarEnvio}
        />
      )}

      {itemCorrigir && (
        <CorrigirItemModal
          itemCorrigir={itemCorrigir}
          buscaCliente={buscaCliente}
          setBuscaCliente={setBuscaCliente}
          carregarClientes={carregarClientes}
          loadingClientes={loadingClientes}
          clientesFiltrados={clientesFiltrados}
          clienteSelecionadoId={clienteSelecionadoId}
          setClienteSelecionadoId={setClienteSelecionadoId}
          setItemCorrigir={setItemCorrigir}
          loading={loading}
          salvarClienteCorrigido={salvarClienteCorrigido}
        />
      )}

      {resultadoHistorico && (
        <ResultadoEnvioModal
          resultadoHistorico={resultadoHistorico}
          setResultadoHistorico={setResultadoHistorico}
          setErro={setErro}
        />
      )}
    </div>
  );
}
