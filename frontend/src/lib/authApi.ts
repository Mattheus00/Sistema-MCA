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
  email: string;
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

/** Espelha ValidarLoginResponseDTO (encontrado, login, nome, mensagem). */
export type ValidarLoginRecuperacaoResponse = {
  encontrado?: boolean;
  login?: string;
  nome?: string;
  mensagem?: string;
};

/** POST /api/auth/validar-login-recuperacao — fluxo legado, só ambiente local. */
export async function validarLoginRecuperacao(
  login: string,
): Promise<ValidarLoginRecuperacaoResponse> {
  const r = await api.post<ValidarLoginRecuperacaoResponse>("/api/auth/validar-login-recuperacao", {
    login,
  });
  return r.data;
}

export type RedefinirSenhaPayload = {
  login: string;
  novaSenha: string;
  confirmarSenha: string;
};

/** POST /api/auth/redefinir-senha — fluxo legado sem token, só ambiente local. */
export async function redefinirSenha(payload: RedefinirSenhaPayload): Promise<void> {
  await api.post("/api/auth/redefinir-senha", payload);
}

export type MensagemAuthResponse = {
  mensagem?: string;
};

/** POST /api/auth/solicitar-redefinicao — envia link por e-mail cadastrado. */
export async function solicitarRedefinicao(login: string): Promise<MensagemAuthResponse> {
  const r = await api.post<MensagemAuthResponse>("/api/auth/solicitar-redefinicao", { login });
  return r.data ?? {};
}

export type ConfirmarRedefinicaoPayload = {
  token: string;
  novaSenha: string;
  confirmarSenha: string;
};

/** POST /api/auth/confirmar-redefinicao — redefine senha com token do e-mail. */
export async function confirmarRedefinicao(
  payload: ConfirmarRedefinicaoPayload,
): Promise<MensagemAuthResponse> {
  const r = await api.post<MensagemAuthResponse>("/api/auth/confirmar-redefinicao", payload);
  return r.data ?? {};
}
