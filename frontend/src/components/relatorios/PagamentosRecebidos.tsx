import type { Dispatch, SetStateAction } from "react";
import { DownloadIcon, ExcelIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarData, formatarMoeda } from "@/components/relatorios/relatorioFormatacao";
import { mesReferenciaPagamentoRecebido } from "@/lib/apiNormalizers";
import { exportarCSV } from "@/lib/exportarCsv";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { PagamentosRecebidosRelatorio } from "@/types/api";
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

type PagamentosRecebidosProps = {
  dataInicioPag: string;
  setDataInicioPag: Dispatch<SetStateAction<string>>;
  dataFimPag: string;
  setDataFimPag: Dispatch<SetStateAction<string>>;
  pagamentos: PagamentosRecebidosRelatorio | null;
  loadingPagamentos: boolean;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

export default function PagamentosRecebidos({
  dataInicioPag,
  setDataInicioPag,
  dataFimPag,
  setDataFimPag,
  pagamentos,
  loadingPagamentos,
  gerarRelatorioPdf,
}: PagamentosRecebidosProps) {
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

  return (
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
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
                <Typography fontWeight={600}>{formatarMoeda(pagamentos.valorTotal)}</Typography>
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
            <Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarPagamentosExcel}>
              Exportar Excel
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
