import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CampoSenha from "@/components/auth/CampoSenha";
import { LoginArtwork, LogoIcon, SecureIcon } from "@/components/auth/LoginIcons";
import { getMensagemErroRecuperacao, MSG_SENHA_ALTERADA } from "@/components/auth/loginAuth";
import { confirmarRedefinicao } from "@/lib/authApi";
import "@/styles/login.css";

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = useMemo(() => (params.get("token") ?? "").trim(), [params]);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(token ? null : "Link inválido ou expirado.");
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!token) {
      setErro("Link inválido ou expirado.");
      return;
    }
    if (!novaSenha || !confirmarSenha) {
      setErro("Nova senha e confirmação são obrigatórias.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação da senha não confere.");
      return;
    }
    setLoading(true);
    try {
      const data = await confirmarRedefinicao({ token, novaSenha, confirmarSenha });
      setSucesso(data.mensagem?.trim() || MSG_SENHA_ALTERADA);
    } catch (err: unknown) {
      setErro(getMensagemErroRecuperacao(err, "Não foi possível alterar senha"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-login">
      <aside className="page-login__hero">
        <LoginArtwork />
        <div className="page-login__hero-inner">
          <div className="page-login__hero-brand">
            <LogoIcon color="#fff" />
            <div>
              <strong>Contabilidade São Judas Tadeu</strong>
              <span>Sistema de Gerenciamento de Inadimplentes</span>
            </div>
          </div>
          <div className="page-login__hero-content">
            <h2 className="page-login__hero-title">
              Redefina sua senha.<span>Acesso seguro.</span>
            </h2>
            <p className="page-login__hero-text">
              Use o link recebido por e-mail para definir uma nova senha da sua conta.
            </p>
          </div>
        </div>
      </aside>

      <main className="page-login__main">
        <div className="page-login__form-panel">
          <header className="page-login__card-brand">
            <LogoIcon />
            <div>
              <strong>Contabilidade São Judas Tadeu</strong>
              <span>Sistema de Gerenciamento de Inadimplentes</span>
            </div>
          </header>

          <p className="page-login__eyebrow">Área do funcionário</p>
          <h1 className="page-login__welcome">Redefinir senha</h1>
          <p className="page-login__subtitle">Informe a nova senha para concluir a recuperação</p>

          {erro && (
            <p className="page-login__erro" role="alert">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="page-login__sucesso" role="status">
              {sucesso}
            </p>
          )}

          {sucesso ? (
            <p className="page-login__footer">
              <Link to="/login" className="page-login__footer-link">
                Voltar para o login
              </Link>
            </p>
          ) : (
            <form onSubmit={(ev) => void handleSubmit(ev)} className="page-login__form">
              <CampoSenha
                label="Nova senha"
                value={novaSenha}
                onChange={setNovaSenha}
                placeholder="Nova senha"
                autoComplete="new-password"
                disabled={loading || !token}
                ariaLabel="Nova senha"
                visivel={mostrarNova}
                onToggleVisivel={() => setMostrarNova((v) => !v)}
              />
              <CampoSenha
                label="Confirmar nova senha"
                value={confirmarSenha}
                onChange={setConfirmarSenha}
                placeholder="Confirmar nova senha"
                autoComplete="new-password"
                disabled={loading || !token}
                ariaLabel="Confirmar nova senha"
                visivel={mostrarConfirmar}
                onToggleVisivel={() => setMostrarConfirmar((v) => !v)}
              />
              <button type="submit" className="page-login__btn" disabled={loading || !token}>
                {loading ? "Alterando…" : "Salvar nova senha"}
              </button>
              <p className="page-login__footer">
                <Link to="/login" className="page-login__footer-link">
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </div>
        <p className="page-login__secure">
          <SecureIcon />
          Ambiente seguro e monitorado
        </p>
      </main>
    </div>
  );
}
