import type { Dispatch, SetStateAction } from "react";
import { DownloadIcon } from "@/components/relatorios/RelatoriosIcons";
import { formatarData, formatarMoeda } from "@/components/relatorios/relatorioFormatacao";
import type { DadosRelatorioPdf } from "@/lib/relatorioPdf";
import type { Cliente, ExtratoCliente as ExtratoClienteDados } from "@/types/api";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
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

type ExtratoClienteProps = {
  clientes: Cliente[];
  loadingClientes: boolean;
  clienteExtratoId: string;
  setClienteExtratoId: Dispatch<SetStateAction<string>>;
  extrato: ExtratoClienteDados | null;
  loadingExtrato: boolean;
  gerarRelatorioPdf: (dados: DadosRelatorioPdf) => Promise<void>;
};

export default function ExtratoCliente({
  clientes,
  loadingClientes,
  clienteExtratoId,
  setClienteExtratoId,
  extrato,
  loadingExtrato,
  gerarRelatorioPdf,
}: ExtratoClienteProps) {
  return (
    <Stack spacing={2}>
      <Autocomplete<Cliente, false, false, false>
        size="small"
        sx={{ maxWidth: 480, width: "100%" }}
        options={clientes}
        value={clientes.find((c) => c.id != null && String(c.id) === clienteExtratoId) ?? null}
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
              onClick={() => gerarRelatorioPdf({ aba: "extrato", extrato: extrato ?? undefined })}
            >
              Gerar relatório
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
