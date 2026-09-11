import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { UserIcon } from "@/components/auth/LoginIcons";
import {
  getMensagemErroRecuperacao,
  MSG_RECUPERACAO_CONTATO,
  MSG_RECUPERACAO_ENVIADO,
  statusHttpRecuperacao,
} from "@/components/auth/loginAuth";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { isMockEnabled } from "@/lib/api";
import { solicitarRedefinicao } from "@/lib/authApi";

type RecuperarSenhaFormProps = {
  loginInicial: string;
  onFechar: () => void;
  onConcluido: () => void;
};

export default function RecuperarSenhaForm({
  loginInicial,
  onFechar,
  onConcluido,
}: RecuperarSenhaFormProps) {
  useBodyScrollLock(true);

  const [passo, setPasso] = useState<"form" | "enviado" | "contato">("form");
  const [loginRecuperacao, setLoginRecuperacao] = useState(loginInicial.trim());
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);
  const [linkMock, setLinkMock] = useState<string | null>(null);

  function fecharRecuperacaoSenha() {
    if (loadingRecuperacao) return;
    onFechar();
  }

  async function solicitarLink(e: FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    const loginTrim = loginRecuperacao.trim();
    if (!loginTrim) {
      setErroRecuperacao("Login é obrigatório.");
      return;
    }
    setLoadingRecuperacao(true);
    try {
      await solicitarRedefinicao(loginTrim);
      if (isMockEnabled()) {
        setLinkMock(`/redefinir-senha?token=${encodeURIComponent(`mock-reset-${loginTrim}`)}`);
      }
      setPasso("enviado");
    } catch (err: unknown) {
      const status = statusHttpRecuperacao(err);
      const msg = getMensagemErroRecuperacao(err, "Não foi possível solicitar a redefinição.");
      setErroRecuperacao(msg);
      if (status === 422) setPasso("contato");
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  return (
    <ModalOverlay
      className="modal-overlay page-login__recuperacao-overlay"
      onDismiss={fecharRecuperacaoSenha}
    >
      <div className="modal page-login__recuperacao-modal">
        <h2 className="modal__titulo">Recuperar senha</h2>
        {erroRecuperacao && <p className="page-login__erro">{erroRecuperacao}</p>}

        {passo === "contato" && (
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

        {passo === "form" && (
          <form className="page-login__form" onSubmit={(ev) => void solicitarLink(ev)}>
            <p className="page-login__recuperacao-helper">
              Informe seu login. Enviaremos um link para o e-mail cadastrado na conta.
            </p>
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
                {loadingRecuperacao ? "Enviando..." : "Enviar link"}
              </button>
            </div>
          </form>
        )}

        {passo === "enviado" && (
          <div className="page-login__recuperacao-sucesso">
            <p className="page-login__recuperacao-helper">{MSG_RECUPERACAO_ENVIADO}</p>
            {linkMock && (
              <p className="page-login__mock-hint">
                Modo mock:{" "}
                <Link to={linkMock} onClick={onFechar}>
                  abrir link de redefinição
                </Link>
              </p>
            )}
            <div className="modal__botoes">
              <button type="button" className="btn btn--primary" onClick={onConcluido}>
                Voltar para login
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
