import type { AxiosError } from "axios";
import { getApiErrorMessage } from "@/lib/api";
import type { LoginResponse, PerfilUsuario } from "@/types/api";

export const MSG_RECUPERACAO_CONTATO =
  "Para redefinir sua senha, entre em contato com a proprietária do escritório.";
export const MSG_RECUPERACAO_422 =
  "Recuperação de senha pública está desabilitada. Contate a proprietária do escritório.";
export const MSG_RECUPERACAO_429 = "Muitas tentativas. Aguarde um minuto e tente novamente.";
export const MSG_RECUPERACAO_ENVIADO =
  "Se a conta tiver e-mail cadastrado, você receberá um link para redefinir a senha. Sem e-mail, peça à proprietária para cadastrar um endereço.";
export const MSG_SENHA_ALTERADA = "Senha alterada com sucesso.";

export function extrairPerfil(data: LoginResponse): PerfilUsuario | null {
  const bruto = data.perfil ?? data.role ?? data.usuario?.perfil ?? data.usuario?.role;
  if (bruto === "PROPRIETARIA" || bruto === "RESPONSAVEL_FINANCEIRO" || bruto === "FUNCIONARIO")
    return bruto;
  return null;
}

export function extrairNomeOuLogin(data: LoginResponse, loginPadrao: string): string {
  return String(data.usuario?.nome ?? data.usuario?.login ?? loginPadrao).trim() || loginPadrao;
}

export function statusHttpRecuperacao(e: unknown): number | undefined {
  return (e as AxiosError | undefined)?.response?.status;
}

export function getMensagemErroRecuperacao(e: unknown, fallback: string): string {
  const status = statusHttpRecuperacao(e);
  if (status === 404) return getApiErrorMessage(e, "Link inválido ou expirado.");
  if (status === 429) return MSG_RECUPERACAO_429;
  if (status === 422) return getApiErrorMessage(e, MSG_RECUPERACAO_422);
  return getApiErrorMessage(e, fallback);
}
