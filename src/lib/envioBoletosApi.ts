import { api } from "@/lib/api";
import type { CriarLoteEnvioBoletosResponse, LoteEnvioBoletos } from "@/types/api";

const BASE = "/api/lotes-envio-boletos";

export async function criarLoteEnvioBoletos(files: File[]): Promise<LoteEnvioBoletos> {
  const form = new FormData();
  for (const file of files) form.append("arquivos", file, file.name);
  const { data } = await api.post<CriarLoteEnvioBoletosResponse>(BASE, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.lote;
}

export async function consultarLoteEnvioBoletos(loteId: string): Promise<LoteEnvioBoletos> {
  const { data } = await api.get<LoteEnvioBoletos>(`${BASE}/${loteId}`);
  return data;
}

export async function confirmarItemEnvioBoleto(loteId: string, itemId: string) {
  const { data } = await api.patch<LoteEnvioBoletos>(`${BASE}/${loteId}/itens/${itemId}/confirmar`);
  return data;
}

export async function ignorarItemEnvioBoleto(loteId: string, itemId: string) {
  const { data } = await api.patch<LoteEnvioBoletos>(`${BASE}/${loteId}/itens/${itemId}/ignorar`);
  return data;
}

export async function enviarLoteEnvioBoletos(loteId: string) {
  const { data } = await api.post(`${BASE}/${loteId}/enviar`, {});
  return data;
}
