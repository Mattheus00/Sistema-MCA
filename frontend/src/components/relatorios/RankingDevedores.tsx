import type { Dispatch, SetStateAction } from "react";
import { DownloadIcon, ExcelIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarMoeda } from "@/components/relatorios/relatorioFormatacao";
import { exportarCSV } from "@/lib/exportarCsv";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { RankingDevedorItem } from "@/types/api";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";

type RankingDevedoresProps = {
  ranking: RankingDevedorItem[];
  loadingRanking: boolean;
  filtroPeriodo: string;
  setFiltroPeriodo: Dispatch<SetStateAction<string>>;
  filtroLimit: number;
  setFiltroLimit: Dispatch<SetStateAction<number>>;
  filtroValorMin: string;
  setFiltroValorMin: Dispatch<SetStateAction<string>>;
  filtroQtdDividas: string;
  setFiltroQtdDividas: Dispatch<SetStateAction<string>>;
  filtroDiasAtraso: string;
  setFiltroDiasAtraso: Dispatch<SetStateAction<string>>;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

function statusChip(status: RankingDevedorItem["status"]) {
  const conf =
    status === "Crítico"
      ? { color: "error" as const, label: "Crítico" }
      : status === "Atenção"
        ? { color: "warning" as const, label: "Atenção" }
        : { color: "success" as const, label: "Recente" };
  return <Chip size="small" color={conf.color} label={conf.label} />;
}

export default function RankingDevedores({
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
  gerarRelatorioPdf,
}: RankingDevedoresProps) {
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

  return (
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
          onClick={() => gerarRelatorioPdf({ aba: "ranking", ranking, filtroPeriodo, filtroLimit })}
        >
          Gerar relatório
        </Button>
        <Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarRankingExcel}>
          Exportar Excel
        </Button>
      </Stack>
    </Stack>
  );
}
