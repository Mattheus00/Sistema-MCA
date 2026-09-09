import { useState, type FormEvent } from "react";
import CampoSenha from "@/components/auth/CampoSenha";
import { UserIcon } from "@/components/auth/LoginIcons";
import {
  getMensagemErroRecuperacao,
  isProducaoApi,
  MSG_RECUPERACAO_CONTATO,
  statusHttpRecuperacao,
  type PassoRecuperacao,
} from "@/components/auth/loginAuth";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { isMockEnabled } from "@/lib/api";
import {
  redefinirSenha,
  validarLoginRecuperacao as validarLoginRecuperacaoApi,
} from "@/lib/authApi";

type RecuperarSenhaFormProps = {
  loginInicial: string;
  onFechar: () => void;
  onConcluido: (login: string) => void;
};

export default function RecuperarSenhaForm({
  loginInicial,
  onFechar,
  onConcluido,
}: RecuperarSenhaFormProps) {
  useBodyScrollLock(true);

  const recuperacaoPublicaDesabilitada = isProducaoApi();
  const [passoRecuperacao, setPassoRecuperacao] = useState<PassoRecuperacao>(
    recuperacaoPublicaDesabilitada ? "contato" : 1,
  );
  const [loginRecuperacao, setLoginRecuperacao] = useState(loginInicial.trim());
  const [nomeRecuperacao, setNomeRecuperacao] = useState("");
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState("");
  const [confirmarSenhaRecuperacao, setConfirmarSenhaRecuperacao] = useState("");
  const [mostrarNovaSenhaRecuperacao, setMostrarNovaSenhaRecuperacao] = useState(false);
  const [mostrarConfirmarSenhaRecuperacao, setMostrarConfirmarSenhaRecuperacao] = useState(false);
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);

  function fecharRecuperacaoSenha() {
    if (loadingRecuperacao) return;
    onFechar();
  }

  function aplicarErroRecuperacao(e: unknown, fallback: string) {
    const status = statusHttpRecuperacao(e);
    const msg = getMensagemErroRecuperacao(e, fallback);
    setErroRecuperacao(msg);
    // 422: não avançar / esconder o passo de redefinir senha
    if (status === 422) setPassoRecuperacao("contato");
  }

  async function validarLoginRecuperacao(e: FormEvent) {
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
      const data = await validarLoginRecuperacaoApi(loginTrim);
      if (!data?.encontrado) {
        setErroRecuperacao("Usuário não encontrado");
        return;
      }
      // 200: mantém fluxo local de duas etapas
      setLoginRecuperacao(String(data.login ?? loginTrim));
      setNomeRecuperacao(String(data.nome ?? ""));
      setPassoRecuperacao(2);
    } catch (err: unknown) {
      aplicarErroRecuperacao(err, "Não foi possível validar o login");
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  async function redefinirSenhaRecuperacao(e: FormEvent) {
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
        await redefinirSenha({
          login: loginTrim,
          novaSenha: novaSenhaRecuperacao,
          confirmarSenha: confirmarSenhaRecuperacao,
        });
      }
      setPassoRecuperacao(3);
    } catch (err: unknown) {
      aplicarErroRecuperacao(err, "Não foi possível alterar senha");
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  return (
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
              <button
                type="button"
                className="btn btn--secondary"
                onClick={fecharRecuperacaoSenha}
                disabled={loadingRecuperacao}
              >
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
              Login encontrado{nomeRecuperacao ? ` para ${nomeRecuperacao}` : ""}. Defina sua nova
              senha.
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
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPassoRecuperacao(1)}
                disabled={loadingRecuperacao}
              >
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
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onConcluido(loginRecuperacao.trim())}
              >
                Voltar para login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
