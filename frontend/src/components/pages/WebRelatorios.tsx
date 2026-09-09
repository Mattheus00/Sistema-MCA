import { useState } from "react";
import AgingRelatorio from "@/components/relatorios/AgingRelatorio";
import EfetividadeCobranca from "@/components/relatorios/EfetividadeCobranca";
import ExtratoCliente from "@/components/relatorios/ExtratoCliente";
import InadimplenciaPeriodo from "@/components/relatorios/InadimplenciaPeriodo";
import PagamentosRecebidos from "@/components/relatorios/PagamentosRecebidos";
import RankingDevedores from "@/components/relatorios/RankingDevedores";
import { useRelatorios } from "@/hooks/useRelatorios";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import "@/styles/pages/relatorios.css";

const ABAS = [
  { id: "ranking", label: "Ranking Devedores" },
  { id: "extrato", label: "Extrato por Cliente" },
  { id: "inadimplencia", label: "Inadimplência por Período" },
  { id: "pagamentos", label: "Pagamentos Recebidos" },
  { id: "aging", label: "Aging" },
  { id: "efetividade", label: "Efetividade Cobrança" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

export default function WebRelatorios() {
  const [aba, setAba] = useState<AbaId>("ranking");
  const {
    erro,
    setErro,
    gerarRelatorioPdf,
    clientes,
    loadingClientes,
    ranking,
    loadingRanking,
    filtroPeriodo,
    setFiltroPeriodo,
    filtroLimit,
    setFiltroLimit,
    filtroValorMin,
    setFiltroValorMin,
    filtroQtdDividas,
    setFiltroQtdDividas,
    filtroDiasAtraso,
    setFiltroDiasAtraso,
    clienteExtratoId,
    setClienteExtratoId,
    extrato,
    loadingExtrato,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    inadPeriodo,
    loadingInadPeriodo,
    dataInicioPag,
    setDataInicioPag,
    dataFimPag,
    setDataFimPag,
    pagamentos,
    loadingPagamentos,
    aging,
    loadingAging,
    mesEfetividade,
    setMesEfetividade,
    efetividade,
    loadingEfetividade,
  } = useRelatorios(aba);

  return (
    <Box className="page-relatorios" sx={{ maxWidth: "100%", pb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Gestão de Inadimplentes
      </Typography>
      <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 700, mb: 2 }}>
        Relatórios
      </Typography>

      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v as AbaId)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        {ABAS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>

      {erro && (
        <Alert severity="error" onClose={() => setErro(null)} sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      <Box>
        {aba === "ranking" && (
          <RankingDevedores
            ranking={ranking}
            loadingRanking={loadingRanking}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={setFiltroPeriodo}
            filtroLimit={filtroLimit}
            setFiltroLimit={setFiltroLimit}
            filtroValorMin={filtroValorMin}
            setFiltroValorMin={setFiltroValorMin}
            filtroQtdDividas={filtroQtdDividas}
            setFiltroQtdDividas={setFiltroQtdDividas}
            filtroDiasAtraso={filtroDiasAtraso}
            setFiltroDiasAtraso={setFiltroDiasAtraso}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
        {aba === "extrato" && (
          <ExtratoCliente
            clientes={clientes}
            loadingClientes={loadingClientes}
            clienteExtratoId={clienteExtratoId}
            setClienteExtratoId={setClienteExtratoId}
            extrato={extrato}
            loadingExtrato={loadingExtrato}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
        {aba === "inadimplencia" && (
          <InadimplenciaPeriodo
            dataInicio={dataInicio}
            setDataInicio={setDataInicio}
            dataFim={dataFim}
            setDataFim={setDataFim}
            inadPeriodo={inadPeriodo}
            loadingInadPeriodo={loadingInadPeriodo}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
        {aba === "pagamentos" && (
          <PagamentosRecebidos
            dataInicioPag={dataInicioPag}
            setDataInicioPag={setDataInicioPag}
            dataFimPag={dataFimPag}
            setDataFimPag={setDataFimPag}
            pagamentos={pagamentos}
            loadingPagamentos={loadingPagamentos}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
        {aba === "aging" && (
          <AgingRelatorio
            aging={aging}
            loadingAging={loadingAging}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
        {aba === "efetividade" && (
          <EfetividadeCobranca
            mesEfetividade={mesEfetividade}
            setMesEfetividade={setMesEfetividade}
            efetividade={efetividade}
            loadingEfetividade={loadingEfetividade}
            gerarRelatorioPdf={gerarRelatorioPdf}
          />
        )}
      </Box>
    </Box>
  );
}
