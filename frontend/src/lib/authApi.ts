/**
 * Camada de API de autenticação (AuthController — /api/auth).
 */

import { api } from "@/lib/api";
import type { LoginPayload, LoginResponse } from "@/types/api";

/** POST /api/auth/login → LoginResponseDTO (token, perfil, nome, login). */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const r = await api.post<LoginResponse>("/api/auth/login", payload);
  return r.data;
}

export type RegistrarUsuarioPayload = {
  nome: string;
  login: string;
  senha: string;
};

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

/** POST /api/auth/validar-login-recuperacao. */
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

/** POST /api/auth/redefinir-senha. */
export async function redefinirSenha(payload: RedefinirSenhaPayload): Promise<void> {
  await api.post("/api/auth/redefinir-senha", payload);
}
