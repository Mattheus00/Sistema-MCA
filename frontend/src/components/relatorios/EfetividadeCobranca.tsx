import type { Dispatch, SetStateAction } from "react";
import { DownloadIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarPercentual } from "@/components/relatorios/relatorioFormatacao";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { EfetividadeCobrancaRelatorio } from "@/types/api";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type EfetividadeCobrancaProps = {
  mesEfetividade: string;
  setMesEfetividade: Dispatch<SetStateAction<string>>;
  efetividade: EfetividadeCobrancaRelatorio | null;
  loadingEfetividade: boolean;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

export default function EfetividadeCobranca({
  mesEfetividade,
  setMesEfetividade,
  efetividade,
  loadingEfetividade,
  gerarRelatorioPdf,
}: EfetividadeCobrancaProps) {
  return (
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
                  <strong>{efetividade.cobrancasComPagamento}</strong> ({efetividade.taxaConversao}
                  %)
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
  );
}
