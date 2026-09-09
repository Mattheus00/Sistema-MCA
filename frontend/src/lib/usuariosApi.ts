/**
 * Camada de API de usuários do sistema (UsuarioController — /api/usuarios).
 */

import { api, normalizeListResponse } from "@/lib/api";
import type { CadastroUsuarioPayload, UsuarioAtivo, UsuarioPendente } from "@/types/api";

/** GET /api/usuarios/pendentes → UsuarioResponseDTO[] com status PENDENTE_APROVACAO. */
export async function listarUsuariosPendentes(): Promise<UsuarioPendente[]> {
  const r = await api.get("/api/usuarios/pendentes");
  return normalizeListResponse<UsuarioPendente>(r.data);
}

/** GET /api/usuarios/ativos → UsuarioResponseDTO[] com status ATIVO. */
export async function listarUsuariosAtivos(): Promise<UsuarioAtivo[]> {
  const r = await api.get<UsuarioAtivo[] | unknown>("/api/usuarios/ativos");
  return normalizeListResponse<UsuarioAtivo>(r.data);
}

/** PATCH /api/usuarios/{id}/aprovar?perfil= */
export async function aprovarUsuario(usuarioId: string, perfil: string): Promise<void> {
  await api.patch(`/api/usuarios/${usuarioId}/aprovar?perfil=${encodeURIComponent(perfil)}`, {});
}

/** PATCH /api/usuarios/{id}/revogar */
export async function revogarUsuario(usuarioId: string): Promise<void> {
  await api.patch(`/api/usuarios/${usuarioId}/revogar`, {});
}

/** POST /api/usuarios — cadastro direto pela proprietária. */
export async function cadastrarUsuario(payload: CadastroUsuarioPayload): Promise<void> {
  await api.post("/api/usuarios", payload);
}
