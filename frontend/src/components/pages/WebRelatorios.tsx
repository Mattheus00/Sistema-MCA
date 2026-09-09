import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, getRelatorioErrorMessage } from "@/lib/api";
import { exportarCSV } from "@/lib/exportarCsv";
import { exportarRelatorioPdf, type DadosRelatorioPdf } from "@/lib/relatorioPdf";
import {
  decodeConfirmadoPorComprovante,
  mesReferenciaPagamentoRecebido,
} from "@/lib/apiNormalizers";
import { listarClientes } from "@/lib/clientesApi";
import { listarInadimplentes, listarPagamentosDivida } from "@/lib/inadimplentesApi";
import {
  obterAging,
  obterEfetividadeCobranca,
  obterExtratoCliente,
  obterInadimplenciaPeriodo,
  obterPagamentosRecebidos,
  obterRankingDevedores,
  obterResumoFinanceiro,
} from "@/lib/relatoriosApi";
import type {
  Cliente,
  RankingDevedorItem,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  PagamentosRecebidosRelatorio,
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
} from "@/types/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";

const ABAS = [
  { id: "ranking", label: "Ranking Devedores" },
  { id: "extrato", label: "Extrato por Cliente" },
  { id: "inadimplencia", label: "Inadimplência por Período" },
  { id: "pagamentos", label: "Pagamentos Recebidos" },
  { id: "aging", label: "Aging" },
  { id: "efetividade", label: "Efetividade Cobrança" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

function formatarData(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarMoeda(n: number | null | undefined) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(n: number | null | undefined, casas = 1) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${valor.toFixed(casas)}%`;
}

export default function WebRelatorios() {
  const [aba, setAba] = useState<AbaId>("ranking");
  const [erro, setErro] = useState<string | null>(null);

  // Clientes (para busca do extrato)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Ranking
  const [ranking, setRanking] = useState<RankingDevedorItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroLimit, setFiltroLimit] = useState(20);
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroQtdDividas, setFiltroQtdDividas] = useState("");
  const [filtroDiasAtraso, setFiltroDiasAtraso] = useState("");

  // Extrato
  const [clienteExtratoId, setClienteExtratoId] = useState<string>("");
  const [extrato, setExtrato] = useState<ExtratoCliente | null>(null);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  // Inadimplência período
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [inadPeriodo, setInadPeriodo] = useState<InadimplenciaPeriodoRelatorio | null>(null);
  const [loadingInadPeriodo, setLoadingInadPeriodo] = useState(false);

  // Pagamentos recebidos
  const [dataInicioPag, setDataInicioPag] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimPag, setDataFimPag] = useState(() => new Date().toISOString().slice(0, 10));
  const [pagamentos, setPagamentos] = useState<PagamentosRecebidosRelatorio | null>(null);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);

  // Aging
  const [aging, setAging] = useState<AgingRelatorio | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  // Efetividade
  const [mesEfetividade, setMesEfetividade] = useState(() => new Date().toISOString().slice(0, 7));
  const [efetividade, setEfetividade] = useState<EfetividadeCobrancaRelatorio | null>(null);
  const [loadingEfetividade, setLoadingEfetividade] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        setClientes(await listarClientes({ page: 0, size: 500 }));
      } catch {
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  const carregarRanking = useCallback(async () => {
    setErro(null);
    setLoadingRanking(true);
    try {
      setRanking(
        await obterRankingDevedores({
          periodo: filtroPeriodo,
          limit: filtroLimit,
          valorMin: filtroValorMin,
          qtdDividas: filtroQtdDividas,
          diasAtraso: filtroDiasAtraso,
        }),
      );
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar ranking"));
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  }, [filtroPeriodo, filtroLimit, filtroValorMin, filtroQtdDividas, filtroDiasAtraso]);

  useEffect(() => {
    if (aba === "ranking") void carregarRanking();
  }, [aba, carregarRanking]);

  const carregarExtrato = useCallback(async () => {
    if (!clienteExtratoId) {
      setExtrato(null);
      return;
    }
    setErro(null);
    setLoadingExtrato(true);
    try {
      setExtrato(await obterExtratoCliente(clienteExtratoId));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar extrato"));
      setExtrato(null);
    } finally {
      setLoadingExtrato(false);
    }
  }, [clienteExtratoId]);

  useEffect(() => {
    if (aba === "extrato" && clienteExtratoId) void carregarExtrato();
    else if (aba === "extrato" && !clienteExtratoId) setExtrato(null);
  }, [aba, clienteExtratoId, carregarExtrato]);

  const carregarInadimplenciaPeriodo = useCallback(async () => {
    setErro(null);
    setLoadingInadPeriodo(true);
    try {
      setInadPeriodo(await obterInadimplenciaPeriodo(dataInicio, dataFim));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar relatório"));
      setInadPeriodo(null);
    } finally {
      setLoadingInadPeriodo(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    if (aba === "inadimplencia") void carregarInadimplenciaPeriodo();
  }, [aba, carregarInadimplenciaPeriodo]);

  const carregarPagamentos = useCallback(async () => {
    setErro(null);
    setLoadingPagamentos(true);
    try {
      try {
        const normalizado = await obterPagamentosRecebidos(dataInicioPag, dataFimPag);
        if (normalizado) {
          setPagamentos(normalizado);
          return;
        }
      } catch {
        // Endpoint opcional: tenta montar o detalhamento pelas dívidas pagas.
      }

      const [resumoRes, inadRes] = await Promise.allSettled([
        obterResumoFinanceiro(dataInicioPag, dataFimPag),
        listarInadimplentes(),
      ]);

      const resumo = resumoRes.status === "fulfilled" ? resumoRes.value : null;

      const detalhamento: PagamentosRecebidosRelatorio["detalhamento"] = [];
      if (inadRes.status === "fulfilled") {
        const lista = inadRes.value;
        const inicio = new Date(dataInicioPag);
        const fim = new Date(dataFimPag);
        const naFaixa = (iso: string) => {
          const dtStr = iso.split("T")[0];
          if (!dtStr) return false;
          const dt = new Date(dtStr);
          return dt >= inicio && dt <= fim;
        };

        for (const i of lista) {
          const pagamentosItem = i.pagamentos ?? [];
          if (pagamentosItem.length > 0) {
            for (const p of pagamentosItem) {
              const dataPag = (p.dataPagamento ?? "").split("T")[0];
              if (!dataPag || !naFaixa(dataPag)) continue;
              detalhamento.push({
                data: dataPag,
                clienteNome: i.clienteNome ?? `Cliente #${i.clienteId ?? "—"}`,
                protocolo: String(p.pagamentoId ?? i.id ?? ""),
                valor: Number(p.valorPago ?? 0),
                metodo: p.metodoPagamento ?? "—",
                saldoRestante: 0,
                vencimento: i.vencimento,
                confirmadoPor:
                  p.confirmadoPor?.trim() ||
                  decodeConfirmadoPorComprovante(p.comprovante) ||
                  undefined,
              });
            }
            continue;
          }

          if (
            !String(i.status ?? "")
              .toLowerCase()
              .includes("pago")
          )
            continue;
          const dataPag = (i.updatedAt ?? i.createdAt ?? i.vencimento ?? "").split("T")[0];
          if (!dataPag || !naFaixa(dataPag)) continue;

          // Dívida quitada sem array embutido: busca pagamentos da dívida
          let confirmadoPor: string | undefined;
          let metodo = "—";
          let valor = Number(i.valor ?? 0);
          try {
            const pags = await listarPagamentosDivida(String(i.id));
            const ultimo = pags.sort((a, b) =>
              String(b.dataPagamento).localeCompare(String(a.dataPagamento)),
            )[0];
            if (ultimo) {
              confirmadoPor =
                ultimo.confirmadoPor?.trim() ||
                decodeConfirmadoPorComprovante(ultimo.comprovante) ||
                undefined;
              metodo = ultimo.metodoPagamento ?? metodo;
              if (ultimo.valorPago > 0) valor = ultimo.valorPago;
            }
          } catch {
            // sem endpoint de pagamentos por dívida
          }

          detalhamento.push({
            data: dataPag,
            clienteNome: i.clienteNome ?? `Cliente #${i.clienteId ?? "—"}`,
            protocolo: String(i.id ?? ""),
            valor,
            metodo,
            saldoRestante: 0,
            vencimento: i.vencimento,
            confirmadoPor,
          });
        }
      }

      const valorTotal = resumo?.totalRecebido ?? detalhamento.reduce((s, p) => s + p.valor, 0);

      setPagamentos({
        dataInicio: resumo?.periodoInicio ?? dataInicioPag,
        dataFim: resumo?.periodoFim ?? dataFimPag,
        totalPagamentos: detalhamento.length,
        valorTotal,
        porMetodo: [],
        detalhamento,
      });
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar pagamentos recebidos"));
      setPagamentos(null);
    } finally {
      setLoadingPagamentos(false);
    }
  }, [dataInicioPag, dataFimPag]);

  useEffect(() => {
    if (aba === "pagamentos") void carregarPagamentos();
  }, [aba, carregarPagamentos]);

  const carregarAging = useCallback(async () => {
    setErro(null);
    setLoadingAging(true);
    try {
      setAging((await obterAging()) ?? { faixas: [], valorTotalGeral: 0 });
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar aging"));
      setAging(null);
    } finally {
      setLoadingAging(false);
    }
  }, []);

  useEffect(() => {
    if (aba === "aging") void carregarAging();
  }, [aba, carregarAging]);

  const carregarEfetividade = useCallback(async () => {
    setErro(null);
    setLoadingEfetividade(true);
    try {
      setEfetividade(await obterEfetividadeCobranca(mesEfetividade));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar efetividade"));
      setEfetividade(null);
    } finally {
      setLoadingEfetividade(false);
    }
  }, [mesEfetividade]);

  useEffect(() => {
    if (aba === "efetividade") void carregarEfetividade();
  }, [aba, carregarEfetividade]);

  const exportarRankingExcel = () => {
    const cabecalhos = [
      "Posição",
      "Cliente",
      "CPF/CNPJ",
      "Valor Devido",
      "Qtd. Dívidas",
      "Dias Atraso (média)",
      "Status",
    ];
    const linhas = ranking.map((r) => [
      String(r.posicao),
      r.clienteNome,
      r.cpfCnpj,
      String(r.valorDevido),
      String(r.qtdDividas),
      String(r.mediaDiasAtraso),
      r.status,
    ]);
    exportarCSV("ranking-devedores", cabecalhos, linhas);
  };

  const exportarInadimplenciaExcel = () => {
    if (!inadPeriodo) return;
    const cabecalhos = ["Cliente", "CPF/CNPJ", "Qtd. Dívidas", "Valor Total", "Status Pior"];
    const linhas = inadPeriodo.detalhamento.map((d) => [
      d.clienteNome,
      d.cpfCnpj,
      String(d.qtdDividas),
      String(d.valorTotal),
      d.statusPior,
    ]);
    exportarCSV("inadimplencia-periodo", cabecalhos, linhas);
  };

  const exportarPagamentosExcel = () => {
    if (!pagamentos) return;
    const cabecalhos = ["Cliente", "Mês", "Valor recebido", "Confirmado por", "Data", "Método"];
    const linhas =
      pagamentos.detalhamento.length > 0
        ? pagamentos.detalhamento.map((p) => [
            p.clienteNome,
            mesReferenciaPagamentoRecebido(p),
            String(p.valor),
            p.confirmadoPor?.trim() || "—",
            p.data,
            p.metodo,
          ])
        : [
            [
              "—",
              "—",
              String(pagamentos.valorTotal),
              "—",
              `${pagamentos.dataInicio} a ${pagamentos.dataFim}`,
              "—",
            ],
          ];
    exportarCSV("pagamentos-recebidos", cabecalhos, linhas);
  };

  const exportarAgingExcel = () => {
    if (!aging) return;
    const cabecalhos = ["Faixa", "Qtd. Dívidas", "Valor Total", "%"];
    const linhas = aging.faixas.map((f) => [
      f.faixa,
      String(f.qtdDividas),
      String(f.valorTotal),
      formatarPercentual(f.percentual),
    ]);
    exportarCSV("aging", cabecalhos, linhas);
  };

  async function gerarRelatorioPdf(dados: DadosRelatorioPdf) {
    try {
      await exportarRelatorioPdf(dados);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    }
  }

  const statusChip = (status: RankingDevedorItem["status"]) => {
    const conf =
      status === "Crítico"
        ? { color: "error" as const, label: "Crítico" }
        : status === "Atenção"
          ? { color: "warning" as const, label: "Atenção" }
          : { color: "success" as const, label: "Recente" };
    return <Chip size="small" color={conf.color} label={conf.label} />;
  };

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
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Período"
                size="small"
                sx={{ minWidth: 160 }}
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano</option>
              </TextField>
              <TextField
                select
                SelectProps={{ native: true }}
                label="Limite"
                size="small"
                sx={{ minWidth: 120 }}
                value={filtroLimit}
                onChange={(e) => setFiltroLimit(Number(e.target.value))}
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </TextField>
              <TextField
                type="number"
                label="Valor mínimo"
                size="small"
                placeholder="Opcional"
                sx={{ minWidth: 140 }}
                value={filtroValorMin}
                onChange={(e) => setFiltroValorMin(e.target.value)}
              />
              <TextField
                type="number"
                label="Qtd. dívidas mín."
                size="small"
                placeholder="Opcional"
                sx={{ minWidth: 140 }}
                value={filtroQtdDividas}
                onChange={(e) => setFiltroQtdDividas(e.target.value)}
              />
              <TextField
                type="number"
                label="Dias atraso mín."
                size="small"
                placeholder="Opcional"
                sx={{ minWidth: 140 }}
                value={filtroDiasAtraso}
                onChange={(e) => setFiltroDiasAtraso(e.target.value)}
              />
            </Stack>
            <Card elevation={1}>
              <CardHeader
                title="Ranking de Maiores Devedores"
                titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
              />
              <CardContent sx={{ pt: 0 }}>
                {loadingRanking ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Posição</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Cliente</strong>
                          </TableCell>
                          <TableCell>
                            <strong>CPF/CNPJ</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>Valor Devido</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Qtd. Dívidas</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Dias Atraso (média)</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Status</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ranking.map((r) => (
                          <TableRow key={r.clienteId} hover>
                            <TableCell>{r.posicao}</TableCell>
                            <TableCell>{r.clienteNome}</TableCell>
                            <TableCell>{r.cpfCnpj}</TableCell>
                            <TableCell align="right">{formatarMoeda(r.valorDevido)}</TableCell>
                            <TableCell align="center">{r.qtdDividas}</TableCell>
                            <TableCell align="center">{r.mediaDiasAtraso} dias</TableCell>
                            <TableCell>{statusChip(r.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() =>
                  gerarRelatorioPdf({ aba: "ranking", ranking, filtroPeriodo, filtroLimit })
                }
              >
                Gerar relatório
              </Button>
              <Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarRankingExcel}>
                Exportar Excel
              </Button>
            </Stack>
          </Stack>
        )}

        {aba === "extrato" && (
          <Stack spacing={2}>
            <Autocomplete<Cliente, false, false, false>
              size="small"
              sx={{ maxWidth: 480, width: "100%" }}
              options={clientes}
              value={
                clientes.find((c) => c.id != null && String(c.id) === clienteExtratoId) ?? null
              }
              onChange={(_, c) => setClienteExtratoId(c?.id != null ? String(c.id) : "")}
              getOptionLabel={(c) => c.nome}
              isOptionEqualToValue={(a, b) => String(a.id ?? "") === String(b.id ?? "")}
              filterOptions={createFilterOptions<Cliente>({
                stringify: (c) => [c.nome, c.cpf, c.email, c.telefone].filter(Boolean).join(" "),
              })}
              loading={loadingClientes}
              disabled={loadingClientes}
              noOptionsText="Nenhum cliente encontrado"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  placeholder="Digite o nome, CPF, e-mail ou telefone"
                  InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                />
              )}
              ListboxProps={{ style: { maxHeight: 280 } }}
            />
            {loadingExtrato && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
            {extrato && !loadingExtrato && (
              <>
                <Card elevation={1}>
                  <CardHeader
                    title="A) Dados do Cliente"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <Stack spacing={0.5}>
                      <Typography>
                        <strong>Nome:</strong> {extrato.cliente.nome}
                      </Typography>
                      <Typography>
                        <strong>CPF:</strong> {extrato.cliente.cpfCnpj}
                      </Typography>
                      <Typography>
                        <strong>Telefone:</strong> {extrato.cliente.telefone ?? "—"}
                      </Typography>
                      <Typography>
                        <strong>Email:</strong> {extrato.cliente.email ?? "—"}
                      </Typography>
                      <Typography>
                        <strong>Status:</strong> {extrato.cliente.status}
                      </Typography>
                      <Typography>
                        <strong>Saldo Devedor Total:</strong>{" "}
                        {formatarMoeda(extrato.cliente.saldoDevedorTotal)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
                <Card elevation={1}>
                  <CardHeader
                    title="B) Dívidas Ativas"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Protocolo</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Descrição</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Vencimento</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor Original</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor Devido</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Status</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Dias Atraso</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {extrato.dividasAtivas.map((d) => (
                            <TableRow key={d.id} hover>
                              <TableCell>{d.protocolo}</TableCell>
                              <TableCell>{d.descricao}</TableCell>
                              <TableCell>{formatarData(d.vencimento)}</TableCell>
                              <TableCell align="right">{formatarMoeda(d.valorOriginal)}</TableCell>
                              <TableCell align="right">{formatarMoeda(d.valorDevido)}</TableCell>
                              <TableCell>{d.status}</TableCell>
                              <TableCell align="center">{d.diasAtraso}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                <Card elevation={1}>
                  <CardHeader
                    title="C) Histórico de Pagamentos"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Data</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Protocolo</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor Pago</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Método</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Saldo Após</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {extrato.historicoPagamentos.map((p, i) => (
                            <TableRow key={i} hover>
                              <TableCell>{formatarData(p.data)}</TableCell>
                              <TableCell>{p.protocolo}</TableCell>
                              <TableCell align="right">{formatarMoeda(p.valorPago)}</TableCell>
                              <TableCell>{p.metodo}</TableCell>
                              <TableCell align="right">{formatarMoeda(p.saldoApos)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                <Card elevation={1}>
                  <CardHeader
                    title="D) Notificações Enviadas"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Data</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Tipo</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Status</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Tentativas</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {extrato.notificacoes.map((n, i) => (
                            <TableRow key={i} hover>
                              <TableCell>{formatarData(n.data)}</TableCell>
                              <TableCell>{n.tipo}</TableCell>
                              <TableCell>{n.status}</TableCell>
                              <TableCell align="center">{n.tentativas}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                <Stack direction="row" justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      gerarRelatorioPdf({ aba: "extrato", extrato: extrato ?? undefined })
                    }
                  >
                    Gerar relatório
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "inadimplencia" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="date"
                label="Data início"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <TextField
                type="date"
                label="Data fim"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </Stack>
            {loadingInadPeriodo && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
            {inadPeriodo && !loadingInadPeriodo && (
              <>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Período
                      </Typography>
                      <Typography fontWeight={600}>
                        {formatarData(inadPeriodo.dataInicio)} a {formatarData(inadPeriodo.dataFim)}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total de clientes com dívidas
                      </Typography>
                      <Typography fontWeight={600}>{inadPeriodo.totalClientes}</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Valor total
                      </Typography>
                      <Typography fontWeight={600}>
                        {formatarMoeda(inadPeriodo.valorTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Dívidas vencidas no período
                      </Typography>
                      <Typography fontWeight={600}>
                        {inadPeriodo.dividasVencidasNoPeriodo} (
                        {formatarMoeda(inadPeriodo.valorVencidoNoPeriodo)})
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
                <Card elevation={1}>
                  <CardHeader
                    title="Detalhamento"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Cliente</strong>
                            </TableCell>
                            <TableCell>
                              <strong>CPF/CNPJ</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Qtd. Dívidas</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor Total</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Status Pior</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inadPeriodo.detalhamento.map((d) => (
                            <TableRow key={d.clienteId} hover>
                              <TableCell>{d.clienteNome}</TableCell>
                              <TableCell>{d.cpfCnpj}</TableCell>
                              <TableCell align="center">{d.qtdDividas}</TableCell>
                              <TableCell align="right">{formatarMoeda(d.valorTotal)}</TableCell>
                              <TableCell>{d.statusPior}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      gerarRelatorioPdf({
                        aba: "inadimplencia",
                        inadPeriodo: inadPeriodo ?? undefined,
                        dataInicio,
                        dataFim,
                      })
                    }
                  >
                    Gerar relatório
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ExcelIcon />}
                    onClick={exportarInadimplenciaExcel}
                  >
                    Exportar Excel
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "pagamentos" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="date"
                label="Data início"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dataInicioPag}
                onChange={(e) => setDataInicioPag(e.target.value)}
              />
              <TextField
                type="date"
                label="Data fim"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dataFimPag}
                onChange={(e) => setDataFimPag(e.target.value)}
              />
            </Stack>
            {loadingPagamentos && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
            {pagamentos && !loadingPagamentos && (
              <>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Período
                      </Typography>
                      <Typography fontWeight={600}>
                        {formatarData(pagamentos.dataInicio || dataInicioPag)} a{" "}
                        {formatarData(pagamentos.dataFim || dataFimPag)}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Valor total recebido
                      </Typography>
                      <Typography fontWeight={600}>
                        {formatarMoeda(pagamentos.valorTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
                <Card elevation={1}>
                  <CardHeader
                    title="Detalhamento dos recebimentos"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Cliente</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Mês</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor recebido</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Confirmado por</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pagamentos.detalhamento.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                Nenhum pagamento detalhado neste período.
                              </TableCell>
                            </TableRow>
                          ) : (
                            pagamentos.detalhamento.map((p, i) => (
                              <TableRow key={`${p.protocolo}-${p.data}-${i}`} hover>
                                <TableCell>{p.clienteNome}</TableCell>
                                <TableCell>{mesReferenciaPagamentoRecebido(p)}</TableCell>
                                <TableCell align="right">{formatarMoeda(p.valor)}</TableCell>
                                <TableCell>{p.confirmadoPor?.trim() || "—"}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      gerarRelatorioPdf({
                        aba: "pagamentos",
                        pagamentosRecebidos: pagamentos ?? undefined,
                        dataInicioPag,
                        dataFimPag,
                      })
                    }
                  >
                    Gerar relatório
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ExcelIcon />}
                    onClick={exportarPagamentosExcel}
                  >
                    Exportar Excel
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "aging" && (
          <Stack spacing={2}>
            {loadingAging && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
            {aging && !loadingAging && (
              <>
                <Card elevation={1}>
                  <CardHeader
                    title="Análise de Aging (Envelhecimento da Dívida)"
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Faixa</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Qtd. Dívidas</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>Valor Total</strong>
                            </TableCell>
                            <TableCell align="right">
                              <strong>% do Total</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {aging.faixas.map((f) => (
                            <TableRow key={f.faixa} hover>
                              <TableCell>{f.faixa}</TableCell>
                              <TableCell align="center">{f.qtdDividas}</TableCell>
                              <TableCell align="right">{formatarMoeda(f.valorTotal)}</TableCell>
                              <TableCell align="right">
                                {formatarPercentual(f.percentual)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography sx={{ mt: 2, fontWeight: 600 }}>
                      Valor total geral: {formatarMoeda(aging.valorTotalGeral)}
                    </Typography>
                  </CardContent>
                </Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => gerarRelatorioPdf({ aba: "aging", aging: aging ?? undefined })}
                  >
                    Gerar relatório
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ExcelIcon />}
                    onClick={exportarAgingExcel}
                  >
                    Exportar Excel
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "efetividade" && (
          <Stack spacing={2}>
            <TextField
              type="month"
              label="Mês"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={mesEfetividade}
              onChange={(e) => setMesEfetividade(e.target.value)}
              sx={{ maxWidth: 220 }}
            />
            {loadingEfetividade && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
            {efetividade && !loadingEfetividade && (
              <>
                <Card elevation={1}>
                  <CardHeader
                    title={`Efetividade de Cobrança — ${efetividade.periodo}`}
                    titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <Stack spacing={1.5}>
                      <Typography>
                        📧 Notificações enviadas: <strong>{efetividade.totalNotificacoes}</strong>
                      </Typography>
                      <Typography>
                        ✅ Emails entregues: <strong>{efetividade.emailsEntregues}</strong> (
                        {formatarPercentual(efetividade.taxaEntrega)})
                      </Typography>
                      <Typography>
                        ❌ Falhas: <strong>{efetividade.falhas}</strong>
                      </Typography>
                      <Typography>
                        💰 Cobranças que resultaram em pagamento:{" "}
                        <strong>{efetividade.cobrancasComPagamento}</strong> (
                        {efetividade.taxaConversao}%)
                      </Typography>
                      <Typography>
                        ⏱ Tempo médio entre cobrança e pagamento:{" "}
                        <strong>{efetividade.tempoMedioDias}</strong> dias
                      </Typography>
                      {efetividade.comparativoAnterior && (
                        <Typography>
                          📊 Comparativo: {efetividade.comparativoAnterior.periodo}{" "}
                          {efetividade.comparativoAnterior.taxaConversao}% → este mês{" "}
                          {efetividade.taxaConversao}% (
                          {efetividade.comparativoAnterior.variacaoPp >= 0 ? "+" : ""}
                          {efetividade.comparativoAnterior.variacaoPp}pp) ✅
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
                <Stack direction="row" justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      gerarRelatorioPdf({
                        aba: "efetividade",
                        efetividade: efetividade ?? undefined,
                        mesEfetividade,
                      })
                    }
                  >
                    Gerar relatório
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" />
    </svg>
  );
}
