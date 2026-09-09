import { useRef, useState } from "react";
import CadastroForm from "@/components/auth/CadastroForm";
import LoginForm from "@/components/auth/LoginForm";
import RecuperarSenhaForm from "@/components/auth/RecuperarSenhaForm";
import {
  ChartFeatureIcon,
  LoginArtwork,
  LogoIcon,
  MailFeatureIcon,
  SecureIcon,
  ShieldFeatureIcon,
} from "@/components/auth/LoginIcons";
import { isMockEnabled } from "@/lib/api";
import "@/styles/login.css";

export default function Login() {
  const loginInputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState("");
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [modalRecuperacaoAberto, setModalRecuperacaoAberto] = useState(false);
  const [reiniciarSenha, setReiniciarSenha] = useState(0);
  const mostrandoLogin = modo === "login";

  function abrirRecuperacaoSenha() {
    setErro(null);
    setMensagemSucesso(null);
    setModalRecuperacaoAberto(true);
  }

  function concluirRecuperacaoSenha(loginTrim: string) {
    setModalRecuperacaoAberto(false);
    setMensagemSucesso("Senha alterada com sucesso.");
    setModo("login");
    setLogin(loginTrim);
    setReiniciarSenha((n) => n + 1);
    setTimeout(() => loginInputRef.current?.focus(), 0);
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
              Gestão inteligente.<span>Resultados reais.</span>
            </h2>
            <p className="page-login__hero-text">
              Gerencie inadimplentes, envie boletos e acompanhe seus recebimentos de forma simples e
              eficiente.
            </p>
          </div>

          <ul className="page-login__features">
            <li>
              <span className="page-login__feature-icon">
                <ChartFeatureIcon />
              </span>
              <div>
                <strong>Acompanhamento completo</strong>
                <p>Visão clara da sua carteira e dos recebimentos.</p>
              </div>
            </li>
            <li>
              <span className="page-login__feature-icon">
                <MailFeatureIcon />
              </span>
              <div>
                <strong>Envio de boletos por e-mail</strong>
                <p>Mais agilidade na rotina e no atendimento.</p>
              </div>
            </li>
            <li>
              <span className="page-login__feature-icon">
                <ShieldFeatureIcon />
              </span>
              <div>
                <strong>Segurança e confiabilidade</strong>
                <p>Cuidado com seus dados em cada acesso.</p>
              </div>
            </li>
          </ul>
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

          {mostrandoLogin ? (
            <>
              <h1 className="page-login__welcome">Bem-vindo de volta!</h1>
              <p className="page-login__subtitle">Faça login para acessar o sistema</p>
            </>
          ) : (
            <>
              <h1 className="page-login__welcome">Criar conta</h1>
              <p className="page-login__subtitle">
                Preencha seus dados para solicitar acesso ao sistema
              </p>
            </>
          )}

          {erro && (
            <p className="page-login__erro" role="alert">
              {erro}
            </p>
          )}
          {mensagemSucesso && (
            <p className="page-login__sucesso" role="status">
              {mensagemSucesso}
            </p>
          )}

          <LoginForm
            visivel={mostrandoLogin}
            login={login}
            onLoginChange={setLogin}
            loginInputRef={loginInputRef}
            loading={loading}
            onLoadingChange={setLoading}
            onErro={setErro}
            onMensagemSucesso={setMensagemSucesso}
            onAbrirRecuperacao={abrirRecuperacaoSenha}
            reiniciarSenha={reiniciarSenha}
          />

          <CadastroForm
            visivel={!mostrandoLogin}
            loading={loading}
            onLoadingChange={setLoading}
            onErro={setErro}
            onMensagemSucesso={setMensagemSucesso}
            onCadastrado={(loginTrim) => {
              setModo("login");
              setLogin(loginTrim);
              setReiniciarSenha((n) => n + 1);
            }}
          />

          <p className="page-login__footer">
            {mostrandoLogin ? (
              <>
                Ainda não tem uma conta?{" "}
                <button
                  type="button"
                  className="page-login__footer-link"
                  onClick={() => {
                    setErro(null);
                    setMensagemSucesso(null);
                    setModo("signup");
                  }}
                  disabled={loading}
                >
                  Fale com o administrador
                </button>
              </>
            ) : (
              <>
                Já possui cadastro?{" "}
                <button
                  type="button"
                  className="page-login__footer-link"
                  onClick={() => {
                    setErro(null);
                    setMensagemSucesso(null);
                    setModo("login");
                  }}
                  disabled={loading}
                >
                  Voltar para o login
                </button>
              </>
            )}
          </p>

          {import.meta.env.DEV && isMockEnabled() && (
            <p className="page-login__mock-hint">
              Modo mock: proprietaria / financeiro / funcionario — senha 123456.
            </p>
          )}
        </div>

        <p className="page-login__secure">
          <SecureIcon />
          Ambiente seguro e monitorado
        </p>
      </main>

      {modalRecuperacaoAberto && (
        <RecuperarSenhaForm
          loginInicial={login}
          onFechar={() => setModalRecuperacaoAberto(false)}
          onConcluido={concluirRecuperacaoSenha}
        />
      )}
    </div>
  );
}
