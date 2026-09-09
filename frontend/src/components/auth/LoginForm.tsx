import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import CampoSenha from "@/components/auth/CampoSenha";
import { UserIcon } from "@/components/auth/LoginIcons";
import { extrairNomeOuLogin, extrairPerfil } from "@/components/auth/loginAuth";
import { getApiErrorMessage, isRememberMePreferred, setAuthSession } from "@/lib/api";
import { login as loginApi } from "@/lib/authApi";
import type { LoginResponse } from "@/types/api";

type LoginFormProps = {
  visivel: boolean;
  login: string;
  onLoginChange: (value: string) => void;
  loginInputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onErro: (erro: string | null) => void;
  onMensagemSucesso: (msg: string | null) => void;
  onAbrirRecuperacao: () => void;
  reiniciarSenha: number;
};

export default function LoginForm({
  visivel,
  login,
  onLoginChange,
  loginInputRef,
  loading,
  onLoadingChange,
  onErro,
  onMensagemSucesso,
  onAbrirRecuperacao,
  reiniciarSenha,
}: LoginFormProps) {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(isRememberMePreferred);

  useEffect(() => {
    if (reiniciarSenha === 0) return;
    setSenha("");
  }, [reiniciarSenha]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onErro(null);
    onMensagemSucesso(null);

    const loginTrimmed = login.trim();
    if (!loginTrimmed) {
      onErro("Login é obrigatório.");
      return;
    }
    if (!senha) {
      onErro("Senha é obrigatória.");
      return;
    }

    onLoadingChange(true);
    try {
      const data: LoginResponse = await loginApi({ login: loginTrimmed, senha });
      const token = data?.token ?? data.accessToken;
      if (token) {
        const perfil = extrairPerfil(data);
        const nomeExibicao = extrairNomeOuLogin(data, loginTrimmed);
        setAuthSession(
          {
            token,
            display: nomeExibicao,
            login: loginTrimmed,
            profile: perfil,
          },
          manterConectado,
        );
        navigate(perfil === "FUNCIONARIO" ? "/clientes" : "/dashboard", { replace: true });
      } else {
        onErro("Resposta inválida do servidor (token não retornado).");
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Falha ao entrar. Verifique suas credenciais.");
      if (msg.toLowerCase().includes("pendente de aprovação")) {
        onErro("Seu cadastro está pendente de aprovação da proprietária.");
      } else {
        onErro(msg);
      }
    } finally {
      onLoadingChange(false);
    }
  }

  if (!visivel) return null;

  return (
    <form onSubmit={handleSubmit} className="page-login__form">
      <div className="page-login__field">
        <label className="page-login__label" htmlFor="login-usuario">
          Usuário
        </label>
        <div className="page-login__input-wrap">
          <span className="page-login__input-icon" aria-hidden="true">
            <UserIcon />
          </span>
          <input
            id="login-usuario"
            type="text"
            autoComplete="username"
            placeholder="Digite seu usuário"
            value={login}
            onChange={(e) => onLoginChange(e.target.value)}
            className="page-login__input"
            disabled={loading}
            aria-label="Usuário"
            ref={loginInputRef}
          />
        </div>
      </div>

      <CampoSenha
        label="Senha"
        value={senha}
        onChange={setSenha}
        placeholder="Digite sua senha"
        autoComplete="current-password"
        disabled={loading}
        ariaLabel="Senha"
        visivel={mostrarSenha}
        onToggleVisivel={() => setMostrarSenha((v) => !v)}
      />

      <div className="page-login__options">
        <label className="page-login__remember">
          <input
            type="checkbox"
            checked={manterConectado}
            onChange={(e) => setManterConectado(e.target.checked)}
            disabled={loading}
          />
          Lembrar meu acesso
        </label>
        <button
          type="button"
          className="page-login__forgot-link"
          onClick={onAbrirRecuperacao}
          disabled={loading}
        >
          Esqueci minha senha
        </button>
      </div>

      <button type="submit" className="page-login__btn" disabled={loading}>
        {loading ? (
          "Entrando…"
        ) : (
          <>
            Entrar{" "}
            <span className="page-login__btn-arrow" aria-hidden="true">
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}
