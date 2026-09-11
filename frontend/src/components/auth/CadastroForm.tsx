import { useState, type FormEvent } from "react";
import CampoSenha from "@/components/auth/CampoSenha";
import { UserIcon } from "@/components/auth/LoginIcons";
import { getApiErrorMessage } from "@/lib/api";
import { registrar } from "@/lib/authApi";

type CadastroFormProps = {
  visivel: boolean;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onErro: (erro: string | null) => void;
  onMensagemSucesso: (msg: string | null) => void;
  onCadastrado: (login: string) => void;
};

export default function CadastroForm({
  visivel,
  loading,
  onLoadingChange,
  onErro,
  onMensagemSucesso,
  onCadastrado,
}: CadastroFormProps) {
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [loginCadastro, setLoginCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    onErro(null);
    onMensagemSucesso(null);

    const nomeTrim = nomeCadastro.trim();
    const emailTrim = emailCadastro.trim().toLowerCase();
    const loginTrim = loginCadastro.trim();
    if (!nomeTrim) {
      onErro("Nome é obrigatório.");
      return;
    }
    if (!emailTrim) {
      onErro("E-mail é obrigatório.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      onErro("E-mail inválido.");
      return;
    }
    if (!loginTrim) {
      onErro("Login é obrigatório.");
      return;
    }
    if (!senhaCadastro) {
      onErro("Senha é obrigatória.");
      return;
    }

    onLoadingChange(true);
    try {
      await registrar({
        nome: nomeTrim,
        email: emailTrim,
        login: loginTrim,
        senha: senhaCadastro,
      });
      onMensagemSucesso(
        "Cadastro realizado com sucesso. Aguarde aprovação da proprietária para acessar o sistema.",
      );
      onCadastrado(loginTrim);
    } catch (err: unknown) {
      onErro(
        getApiErrorMessage(
          err,
          "Não foi possível realizar o cadastro. Verifique os dados e tente novamente.",
        ),
      );
    } finally {
      onLoadingChange(false);
    }
  }

  if (!visivel) return null;

  return (
    <form onSubmit={handleSignup} className="page-login__form">
      <div className="page-login__field">
        <label className="page-login__label" htmlFor="signup-nome">
          Nome completo
        </label>
        <div className="page-login__input-wrap">
          <span className="page-login__input-icon" aria-hidden="true">
            <UserIcon />
          </span>
          <input
            id="signup-nome"
            type="text"
            autoComplete="name"
            placeholder="Digite seu nome"
            value={nomeCadastro}
            onChange={(e) => setNomeCadastro(e.target.value)}
            className="page-login__input"
            disabled={loading}
            aria-label="Nome completo"
          />
        </div>
      </div>

      <div className="page-login__field">
        <label className="page-login__label" htmlFor="signup-email">
          E-mail
        </label>
        <div className="page-login__input-wrap">
          <span className="page-login__input-icon" aria-hidden="true">
            <UserIcon />
          </span>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            value={emailCadastro}
            onChange={(e) => setEmailCadastro(e.target.value)}
            className="page-login__input"
            disabled={loading}
            aria-label="E-mail"
          />
        </div>
      </div>

      <div className="page-login__field">
        <label className="page-login__label" htmlFor="signup-login">
          Usuário
        </label>
        <div className="page-login__input-wrap">
          <span className="page-login__input-icon" aria-hidden="true">
            <UserIcon />
          </span>
          <input
            id="signup-login"
            type="text"
            autoComplete="username"
            placeholder="Digite seu usuário ou telefone"
            value={loginCadastro}
            onChange={(e) => setLoginCadastro(e.target.value)}
            className="page-login__input"
            disabled={loading}
            aria-label="Login para acesso"
          />
        </div>
      </div>

      <CampoSenha
        label="Senha"
        value={senhaCadastro}
        onChange={setSenhaCadastro}
        placeholder="Digite sua senha"
        autoComplete="new-password"
        disabled={loading}
        ariaLabel="Senha para acesso"
        visivel={mostrarSenhaCadastro}
        onToggleVisivel={() => setMostrarSenhaCadastro((v) => !v)}
      />

      <button type="submit" className="page-login__btn" disabled={loading}>
        {loading ? (
          "Cadastrando…"
        ) : (
          <>
            Cadastrar{" "}
            <span className="page-login__btn-arrow" aria-hidden="true">
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}
