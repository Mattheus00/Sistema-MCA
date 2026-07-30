import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage, isMockEnabled, isRememberMePreferred, setAuthSession } from "@/lib/api";
import type { LoginResponse, PerfilUsuario } from "@/types/api";
import type { AxiosError } from "axios";

const MSG_RECUPERACAO_CONTATO =
  "Para redefinir sua senha, entre em contato com a proprietária do escritório.";
const MSG_RECUPERACAO_422 =
  "Recuperação de senha pública está desabilitada. Contate a proprietária do escritório.";
const MSG_RECUPERACAO_429 = "Muitas tentativas. Aguarde um minuto e tente novamente.";

/** API de produção (não localhost) — recuperação pública desabilitada no backend prod. */
function isProducaoApi(): boolean {
  if (isMockEnabled()) return false;
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return !/localhost|127\.0\.0\.1/i.test(raw);
  }
}

type PassoRecuperacao = 1 | 2 | 3 | "contato";

/** Mesmo ícone do logo da sidebar (Layout) */
function LogoIcon({ color = "var(--cor-principal)" }: { color?: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="4" cy="28" r="4" fill={color} />
      <circle cx="12" cy="28" r="4" fill={color} />
      <circle cx="20" cy="28" r="4" fill={color} />
      <circle cx="28" cy="28" r="4" fill={color} />
      <circle cx="12" cy="20" r="4" fill={color} />
      <circle cx="20" cy="20" r="4" fill={color} />
      <circle cx="28" cy="20" r="4" fill={color} />
      <circle cx="20" cy="12" r="4" fill={color} />
      <circle cx="28" cy="12" r="4" fill={color} />
      <circle cx="28" cy="4" r="4" fill={color} />
    </svg>
  );
}

function ChartFeatureIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V8" />
      <path d="M17 16v-3" />
    </svg>
  );
}

function MailFeatureIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function ShieldFeatureIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SecureIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

type CampoSenhaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
  ariaLabel: string;
  visivel: boolean;
  onToggleVisivel: () => void;
};

function CampoSenha({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  ariaLabel,
  visivel,
  onToggleVisivel,
}: CampoSenhaProps) {
  return (
    <div className="page-login__field">
      <label className="page-login__label">{label}</label>
      <div className="page-login__input-wrap page-login__input-wrap--senha">
      <span className="page-login__input-icon" aria-hidden="true">
        <LockIcon />
      </span>
      <input
        type={visivel ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="page-login__input"
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="page-login__toggle-senha"
        onClick={onToggleVisivel}
        disabled={disabled}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
      >
        {visivel ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const loginInputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [manterConectado, setManterConectado] = useState(isRememberMePreferred);
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [loginCadastro, setLoginCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [modalRecuperacaoAberto, setModalRecuperacaoAberto] = useState(false);
  const [passoRecuperacao, setPassoRecuperacao] = useState<PassoRecuperacao>(1);
  const [loginRecuperacao, setLoginRecuperacao] = useState("");
  const [nomeRecuperacao, setNomeRecuperacao] = useState("");
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState("");
  const [confirmarSenhaRecuperacao, setConfirmarSenhaRecuperacao] = useState("");
  const [mostrarNovaSenhaRecuperacao, setMostrarNovaSenhaRecuperacao] = useState(false);
  const [mostrarConfirmarSenhaRecuperacao, setMostrarConfirmarSenhaRecuperacao] = useState(false);
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);
  const recuperacaoPublicaDesabilitada = isProducaoApi();

  function extrairPerfil(data: LoginResponse): PerfilUsuario | null {
    const bruto = data.perfil ?? data.role ?? data.usuario?.perfil ?? data.usuario?.role;
    if (bruto === "PROPRIETARIA" || bruto === "RESPONSAVEL_FINANCEIRO") return bruto;
    return null;
  }

  function extrairNomeOuLogin(data: LoginResponse, loginPadrao: string): string {
    return String(data.usuario?.nome ?? data.usuario?.login ?? loginPadrao).trim() || loginPadrao;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const loginTrimmed = login.trim();
    if (!loginTrimmed) {
      setErro("Login é obrigatório.");
      return;
    }
    if (!senha) {
      setErro("Senha é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      const payload = { login: loginTrimmed, senha };
      const res = await api.post<LoginResponse>("/api/auth/login", payload);
      const data = res.data;
      const token = data?.token ?? (data as { accessToken?: string }).accessToken;
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
          manterConectado
        );
        navigate("/dashboard", { replace: true });
      } else {
        setErro("Resposta inválida do servidor (token não retornado).");
      }
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "Falha ao entrar. Verifique suas credenciais.");
      if (msg.toLowerCase().includes("pendente de aprovação")) {
        setErro("Seu cadastro está pendente de aprovação da proprietária.");
      } else {
        setErro(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const nomeTrim = nomeCadastro.trim();
    const loginTrim = loginCadastro.trim();
    if (!nomeTrim) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!loginTrim) {
      setErro("Login é obrigatório.");
      return;
    }
    if (!senhaCadastro) {
      setErro("Senha é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        nome: nomeTrim,
        login: loginTrim,
        senha: senhaCadastro,
      });
      setMensagemSucesso("Cadastro realizado com sucesso. Aguarde aprovação da proprietária para acessar o sistema.");
      setModo("login");
      setLogin(loginTrim);
      setSenha("");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível realizar o cadastro. Verifique os dados e tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  function abrirRecuperacaoSenha() {
    setErro(null);
    setMensagemSucesso(null);
    setErroRecuperacao(null);
    setLoginRecuperacao(login.trim());
    setNomeRecuperacao("");
    setNovaSenhaRecuperacao("");
    setConfirmarSenhaRecuperacao("");
    // Em prod a API desabilita os endpoints públicos — mostra só o contato.
    setPassoRecuperacao(recuperacaoPublicaDesabilitada ? "contato" : 1);
    setModalRecuperacaoAberto(true);
  }

  function fecharRecuperacaoSenha() {
    if (loadingRecuperacao) return;
    setModalRecuperacaoAberto(false);
    setErroRecuperacao(null);
    setPassoRecuperacao(1);
  }

  function concluirRecuperacaoSenha() {
    setModalRecuperacaoAberto(false);
    setPassoRecuperacao(1);
    setErroRecuperacao(null);
    setMensagemSucesso("Senha alterada com sucesso.");
    setModo("login");
    setLogin(loginRecuperacao.trim());
    setSenha("");
    setTimeout(() => loginInputRef.current?.focus(), 0);
  }

  function statusHttpRecuperacao(e: unknown): number | undefined {
    return (e as AxiosError | undefined)?.response?.status;
  }

  function getMensagemErroRecuperacao(e: unknown, fallback: string): string {
    const status = statusHttpRecuperacao(e);
    if (status === 404) return "Usuário não encontrado";
    if (status === 429) return MSG_RECUPERACAO_429;
    if (status === 422) return getApiErrorMessage(e, MSG_RECUPERACAO_422);
    return getApiErrorMessage(e, fallback);
  }

  function aplicarErroRecuperacao(e: unknown, fallback: string) {
    const status = statusHttpRecuperacao(e);
    const msg = getMensagemErroRecuperacao(e, fallback);
    setErroRecuperacao(msg);
    // 422: não avançar / esconder o passo de redefinir senha
    if (status === 422) setPassoRecuperacao("contato");
  }

  async function validarLoginRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    const loginTrim = loginRecuperacao.trim();
    if (!loginTrim) {
      setErroRecuperacao("Login é obrigatório.");
      return;
    }
    setLoadingRecuperacao(true);
    try {
      if (isMockEnabled()) {
        setNomeRecuperacao("Usuário de Teste");
        setPassoRecuperacao(2);
        return;
      }
      const res = await api.post<{ encontrado?: boolean; login?: string; nome?: string }>("/api/auth/validar-login-recuperacao", {
        login: loginTrim,
      });
      if (!res.data?.encontrado) {
        setErroRecuperacao("Usuário não encontrado");
        return;
      }
      // 200: mantém fluxo local de duas etapas
      setLoginRecuperacao(String(res.data.login ?? loginTrim));
      setNomeRecuperacao(String(res.data.nome ?? ""));
      setPassoRecuperacao(2);
    } catch (e: unknown) {
      aplicarErroRecuperacao(e, "Não foi possível validar o login");
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  async function redefinirSenhaRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    const loginTrim = loginRecuperacao.trim();
    if (!novaSenhaRecuperacao || !confirmarSenhaRecuperacao) {
      setErroRecuperacao("Nova senha e confirmação são obrigatórias.");
      return;
    }
    if (novaSenhaRecuperacao !== confirmarSenhaRecuperacao) {
      setErroRecuperacao("A confirmação da senha não confere.");
      return;
    }
    setLoadingRecuperacao(true);
    try {
      if (!isMockEnabled()) {
        await api.post("/api/auth/redefinir-senha", {
          login: loginTrim,
          novaSenha: novaSenhaRecuperacao,
          confirmarSenha: confirmarSenhaRecuperacao,
        });
      }
      setPassoRecuperacao(3);
    } catch (e: unknown) {
      aplicarErroRecuperacao(e, "Não foi possível alterar senha");
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  const mostrandoLogin = modo === "login";

  return (
    <div className="page-login">
      <aside className="page-login__hero" aria-hidden="true">
        <div className="page-login__hero-overlay" />
        <div className="page-login__hero-inner">
          <div className="page-login__hero-brand">
            <LogoIcon color="#fff" />
            <div>
              <strong>Contabilidade São Judas Tadeu</strong>
              <span>Sistema de Gerenciamento de Inadimplentes</span>
            </div>
          </div>

          <div className="page-login__hero-content">
            <h2 className="page-login__hero-title">Gestão inteligente. Resultados reais.</h2>
            <p className="page-login__hero-text">
              Gerencie inadimplentes, envie boletos e acompanhe seus recebimentos de forma simples e eficiente.
            </p>
          </div>

          <ul className="page-login__features">
            <li>
              <span className="page-login__feature-icon"><ChartFeatureIcon /></span>
              <div>
                <strong>Acompanhamento completo</strong>
                <p>Tenha visão total da sua carteira e dos recebimentos.</p>
              </div>
            </li>
            <li>
              <span className="page-login__feature-icon"><MailFeatureIcon /></span>
              <div>
                <strong>Envio de boletos por e-mail</strong>
                <p>Mais agilidade e praticidade para você e seus clientes.</p>
              </div>
            </li>
            <li>
              <span className="page-login__feature-icon"><ShieldFeatureIcon /></span>
              <div>
                <strong>Segurança e confiabilidade</strong>
                <p>Seus dados protegidos com as melhores práticas do mercado.</p>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <main className="page-login__main">
        <div className="page-login__card">
          <header className="page-login__card-brand">
            <LogoIcon />
            <div>
              <strong>Contabilidade São Judas Tadeu</strong>
              <span>Sistema de Gerenciamento de Inadimplentes</span>
            </div>
          </header>

          {mostrandoLogin ? (
            <>
              <h1 className="page-login__welcome">Bem-vindo de volta!</h1>
              <p className="page-login__subtitle">Faça login para acessar o sistema</p>
            </>
          ) : (
            <>
              <h1 className="page-login__welcome">Criar conta</h1>
              <p className="page-login__subtitle">Preencha seus dados para solicitar acesso ao sistema</p>
            </>
          )}

          {erro && <p className="page-login__erro">{erro}</p>}
          {mensagemSucesso && <p className="page-login__sucesso">{mensagemSucesso}</p>}

          {mostrandoLogin ? (
            <form onSubmit={handleSubmit} className="page-login__form">
              <div className="page-login__field">
                <label className="page-login__label" htmlFor="login-usuario">Usuário</label>
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
                    onChange={(e) => setLogin(e.target.value)}
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
                  onClick={abrirRecuperacaoSenha}
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>

              <button type="submit" className="page-login__btn" disabled={loading}>
                {loading ? "Entrando…" : "Entrar →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="page-login__form">
              <div className="page-login__field">
                <label className="page-login__label" htmlFor="signup-nome">Nome completo</label>
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
                <label className="page-login__label" htmlFor="signup-login">Usuário</label>
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
                {loading ? "Cadastrando…" : "Cadastrar →"}
              </button>
            </form>
          )}

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

          {isMockEnabled() && (
            <p className="page-login__mock-hint">Modo mock ativo: use qualquer login e senha para entrar.</p>
          )}
        </div>

        <p className="page-login__secure">
          <SecureIcon />
          Ambiente seguro e monitorado
        </p>
      </main>

      {modalRecuperacaoAberto && (
        <div className="modal-overlay page-login__recuperacao-overlay" onClick={fecharRecuperacaoSenha}>
          <div className="modal page-login__recuperacao-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__titulo">Recuperar senha</h2>
            {passoRecuperacao !== "contato" && passoRecuperacao !== 3 && (
              <p className="page-login__recuperacao-step">Passo {passoRecuperacao} de 2</p>
            )}
            {erroRecuperacao && <p className="page-login__erro">{erroRecuperacao}</p>}

            {passoRecuperacao === "contato" && (
              <div className="page-login__recuperacao-sucesso">
                {!erroRecuperacao && (
                  <p className="page-login__recuperacao-helper">{MSG_RECUPERACAO_CONTATO}</p>
                )}
                <div className="modal__botoes">
                  <button type="button" className="btn btn--primary" onClick={fecharRecuperacaoSenha}>
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {passoRecuperacao === 1 && (
              <form className="page-login__form" onSubmit={validarLoginRecuperacao}>
                <div className="page-login__input-wrap">
                  <span className="page-login__input-icon" aria-hidden="true">
                    <UserIcon />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="Informe seu login"
                    value={loginRecuperacao}
                    onChange={(e) => setLoginRecuperacao(e.target.value)}
                    className="page-login__input"
                    disabled={loadingRecuperacao}
                    aria-label="Login para recuperação"
                  />
                </div>
                <div className="modal__botoes">
                  <button type="button" className="btn btn--secondary" onClick={fecharRecuperacaoSenha} disabled={loadingRecuperacao}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={loadingRecuperacao}>
                    {loadingRecuperacao ? "Validando..." : "Continuar"}
                  </button>
                </div>
              </form>
            )}

            {passoRecuperacao === 2 && (
              <form className="page-login__form" onSubmit={redefinirSenhaRecuperacao}>
                <p className="page-login__recuperacao-helper">
                  Login encontrado{nomeRecuperacao ? ` para ${nomeRecuperacao}` : ""}. Defina sua nova senha.
                </p>
                <CampoSenha
                  label="Nova senha"
                  value={novaSenhaRecuperacao}
                  onChange={setNovaSenhaRecuperacao}
                  placeholder="Nova senha"
                  autoComplete="new-password"
                  disabled={loadingRecuperacao}
                  ariaLabel="Nova senha"
                  visivel={mostrarNovaSenhaRecuperacao}
                  onToggleVisivel={() => setMostrarNovaSenhaRecuperacao((v) => !v)}
                />
                <CampoSenha
                  label="Confirmar nova senha"
                  value={confirmarSenhaRecuperacao}
                  onChange={setConfirmarSenhaRecuperacao}
                  placeholder="Confirmar nova senha"
                  autoComplete="new-password"
                  disabled={loadingRecuperacao}
                  ariaLabel="Confirmar nova senha"
                  visivel={mostrarConfirmarSenhaRecuperacao}
                  onToggleVisivel={() => setMostrarConfirmarSenhaRecuperacao((v) => !v)}
                />
                <div className="modal__botoes">
                  <button type="button" className="btn btn--secondary" onClick={() => setPassoRecuperacao(1)} disabled={loadingRecuperacao}>
                    Voltar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={loadingRecuperacao}>
                    {loadingRecuperacao ? "Alterando..." : "Salvar nova senha"}
                  </button>
                </div>
              </form>
            )}

            {passoRecuperacao === 3 && (
              <div className="page-login__recuperacao-sucesso">
                <p className="page-login__sucesso">Senha alterada com sucesso.</p>
                <div className="modal__botoes">
                  <button type="button" className="btn btn--primary" onClick={concluirRecuperacaoSenha}>
                    Voltar para login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
