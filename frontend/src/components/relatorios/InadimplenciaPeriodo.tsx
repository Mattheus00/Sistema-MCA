import type { Dispatch, SetStateAction } from "react";
import { DownloadIcon, ExcelIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarData, formatarMoeda } from "@/components/relatorios/relatorioFormatacao";
import { exportarCSV } from "@/lib/exportarCsv";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { InadimplenciaPeriodoRelatorio } from "@/types/api";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
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
import Typography from "@mui/material/Typography";

type InadimplenciaPeriodoProps = {
  dataInicio: string;
  setDataInicio: Dispatch<SetStateAction<string>>;
  dataFim: string;
  setDataFim: Dispatch<SetStateAction<string>>;
  inadPeriodo: InadimplenciaPeriodoRelatorio | null;
  loadingInadPeriodo: boolean;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

export default function InadimplenciaPeriodo({
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  inadPeriodo,
  loadingInadPeriodo,
  gerarRelatorioPdf,
}: InadimplenciaPeriodoProps) {
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

  return (
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
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
                <Typography fontWeight={600}>{formatarMoeda(inadPeriodo.valorTotal)}</Typography>
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
  );
}
