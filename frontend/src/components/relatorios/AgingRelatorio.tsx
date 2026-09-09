import { DownloadIcon, ExcelIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarMoeda, formatarPercentual } from "@/components/relatorios/relatorioFormatacao";
import { exportarCSV } from "@/lib/exportarCsv";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { AgingRelatorio as AgingRelatorioDados } from "@/types/api";
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
import Typography from "@mui/material/Typography";

type AgingRelatorioProps = {
  aging: AgingRelatorioDados | null;
  loadingAging: boolean;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

export default function AgingRelatorio({
  aging,
  loadingAging,
  gerarRelatorioPdf,
}: AgingRelatorioProps) {
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

  return (
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
                        <TableCell align="right">{formatarPercentual(f.percentual)}</TableCell>
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
            <Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarAgingExcel}>
              Exportar Excel
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
