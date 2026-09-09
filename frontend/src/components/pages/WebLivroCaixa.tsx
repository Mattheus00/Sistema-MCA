import LivroCaixaAnalise from "@/components/livro-caixa/LivroCaixaAnalise";
import LivroCaixaCadastrosModal from "@/components/livro-caixa/LivroCaixaCadastrosModal";
import LivroCaixaDetalheModal from "@/components/livro-caixa/LivroCaixaDetalheModal";
import LivroCaixaFiltros from "@/components/livro-caixa/LivroCaixaFiltros";
import LivroCaixaFormModal from "@/components/livro-caixa/LivroCaixaFormModal";
import LivroCaixaHeader from "@/components/livro-caixa/LivroCaixaHeader";
import LivroCaixaMetrics from "@/components/livro-caixa/LivroCaixaMetrics";
import LivroCaixaRelatorio from "@/components/livro-caixa/LivroCaixaRelatorio";
import LivroCaixaTabela from "@/components/livro-caixa/LivroCaixaTabela";
import { useLivroCaixaMovimentacoes } from "@/hooks/useLivroCaixaMovimentacoes";
import { invalidateLivroCaixa } from "@/lib/livroCaixaApi";
import "@/styles/pages/dashboard.css";
import "@/styles/pages/livro-caixa.css";

export default function WebLivroCaixa() {
  const {
    aba,
    setAba,
    dashboard,
    movimentacoes,
    categorias,
    contas,
    analise,
    relatorio,
    pagina,
    setPagina,
    totalPaginas,
    totalElementos,
    periodoRapido,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    filtroRapido,
    setFiltroRapido,
    tipoFiltro,
    setTipoFiltro,
    statusFiltro,
    setStatusFiltro,
    categoriaFiltro,
    setCategoriaFiltro,
    contaFiltro,
    setContaFiltro,
    formaFiltro,
    setFormaFiltro,
    busca,
    setBusca,
    mostrarFiltrosAvancados,
    setMostrarFiltrosAvancados,
    loadingDashboard,
    loadingLista,
    loadingAnalise,
    loadingRelatorio,
    erro,
    mensagemSucesso,
    modalForm,
    setModalForm,
    detalhe,
    setDetalhe,
    carregandoDetalhe,
    salvandoForm,
    cadastrosAberto,
    setCadastrosAberto,
    recarregarTudo,
    carregarLista,
    aplicarPeriodoRapido,
    aplicarFiltroRapido,
    abrirDetalhe,
    sincronizarLista,
    salvarForm,
  } = useLivroCaixaMovimentacoes();

  return (
    <div className="livro-caixa">
      <LivroCaixaHeader
        onAbrirCadastros={() => setCadastrosAberto(true)}
        onNovaMovimentacao={() => setModalForm("criar")}
      />

      {mensagemSucesso && (
        <p className="toast toast--sucesso toast--flutuante" role="status">
          {mensagemSucesso}
        </p>
      )}

      {erro && (
        <p className="livro-caixa__erro" role="alert">
          {erro}
        </p>
      )}

      <LivroCaixaMetrics dashboard={dashboard} loadingDashboard={loadingDashboard} />

      <LivroCaixaFiltros
        periodoRapido={periodoRapido}
        aplicarPeriodoRapido={aplicarPeriodoRapido}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
        setPagina={setPagina}
        carregarLista={carregarLista}
        aba={aba}
        setAba={setAba}
        filtroRapido={filtroRapido}
        aplicarFiltroRapido={aplicarFiltroRapido}
        mostrarFiltrosAvancados={mostrarFiltrosAvancados}
        setMostrarFiltrosAvancados={setMostrarFiltrosAvancados}
        tipoFiltro={tipoFiltro}
        setTipoFiltro={setTipoFiltro}
        setFiltroRapido={setFiltroRapido}
        statusFiltro={statusFiltro}
        setStatusFiltro={setStatusFiltro}
        categoriaFiltro={categoriaFiltro}
        setCategoriaFiltro={setCategoriaFiltro}
        categorias={categorias}
        contaFiltro={contaFiltro}
        setContaFiltro={setContaFiltro}
        contas={contas}
        formaFiltro={formaFiltro}
        setFormaFiltro={setFormaFiltro}
        busca={busca}
        setBusca={setBusca}
      />

      {aba === "movimentacoes" && (
        <LivroCaixaTabela
          loadingLista={loadingLista}
          movimentacoes={movimentacoes}
          abrirDetalhe={abrirDetalhe}
          totalElementos={totalElementos}
          pagina={pagina}
          totalPaginas={totalPaginas}
          setPagina={setPagina}
        />
      )}

      {aba === "analise" && <LivroCaixaAnalise loadingAnalise={loadingAnalise} analise={analise} />}

      {aba === "relatorio" && (
        <LivroCaixaRelatorio loadingRelatorio={loadingRelatorio} relatorio={relatorio} />
      )}

      <LivroCaixaFormModal
        aberto={modalForm !== null}
        modo={modalForm === "editar" ? "editar" : "criar"}
        movimentacao={modalForm === "editar" ? detalhe : null}
        categorias={categorias}
        contas={contas}
        salvando={salvandoForm}
        onFechar={() => !salvandoForm && setModalForm(null)}
        onSalvar={salvarForm}
      />

      <LivroCaixaDetalheModal
        movimentacao={detalhe}
        contas={contas}
        carregando={carregandoDetalhe}
        onFechar={() => setDetalhe(null)}
        onAtualizado={(m) => {
          setDetalhe(m);
          sincronizarLista(m);
          invalidateLivroCaixa();
          void recarregarTudo();
        }}
        onEditar={(m) => {
          setDetalhe(m);
          setModalForm("editar");
        }}
      />

      <LivroCaixaCadastrosModal
        aberto={cadastrosAberto}
        categorias={categorias}
        contas={contas}
        onFechar={() => setCadastrosAberto(false)}
        onAtualizado={() => void recarregarTudo()}
      />
    </div>
  );
}
