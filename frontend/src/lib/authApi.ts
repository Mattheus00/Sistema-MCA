/**
 * Camada de API de autenticação (AuthController — /api/auth).
 */

import { api } from "@/lib/api";
import type { LoginPayload, LoginResponse, UsuarioLogado } from "@/types/api";

/** POST /api/auth/login → LoginResponseDTO (token, perfil, nome, login). */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const r = await api.post<LoginResponse>("/api/auth/login", payload);
  return r.data;
}

export type RegistrarUsuarioPayload = {
  nome: string;
  login: string;
  senha: string;
  email?: string;
};

/** GET /api/auth/me → UsuarioResponseDTO (inclui usuarioId). */
export async function obterUsuarioLogado(): Promise<UsuarioLogado> {
  const r = await api.get<UsuarioLogado>("/api/auth/me");
  return r.data;
}

/** POST /api/auth/register — cadastro que fica pendente de aprovação. */
export async function registrar(payload: RegistrarUsuarioPayload): Promise<void> {
  await api.post("/api/auth/register", payload);
}

export type MensagemAuthResponse = {
  mensagem?: string;
};

/** POST /api/auth/recuperar-senha/solicitar — sempre 200 com mensagem neutra. */
export async function solicitarRecuperacaoSenha(login: string): Promise<MensagemAuthResponse> {
  const r = await api.post<MensagemAuthResponse>("/api/auth/recuperar-senha/solicitar", { login });
  return r.data ?? {};
}

export type RedefinirSenhaComTokenPayload = {
  token: string;
  novaSenha: string;
  confirmarSenha: string;
};

/** POST /api/auth/recuperar-senha/redefinir — redefine senha com token do e-mail. */
export async function redefinirSenhaComToken(
  payload: RedefinirSenhaComTokenPayload,
): Promise<MensagemAuthResponse> {
  const r = await api.post<MensagemAuthResponse>("/api/auth/recuperar-senha/redefinir", payload);
  return r.data ?? {};
}
