import { useState, type FormEvent } from "react";
import { UserIcon } from "@/components/auth/LoginIcons";
import {
  getMensagemErroRecuperacao,
  MSG_RECUPERACAO_429,
  MSG_RECUPERACAO_ENVIADO,
  statusHttpRecuperacao,
} from "@/components/auth/loginAuth";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { solicitarRecuperacaoSenha } from "@/lib/authApi";

type RecuperarSenhaFormProps = {
  loginInicial: string;
  onFechar: () => void;
  onConcluido: (mensagem: string) => void;
};

export default function RecuperarSenhaForm({
  loginInicial,
  onFechar,
  onConcluido,
}: RecuperarSenhaFormProps) {
  useBodyScrollLock(true);

  const [passo, setPasso] = useState<"form" | "enviado">("form");
  const [loginRecuperacao, setLoginRecuperacao] = useState(loginInicial.trim());
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [mensagemEnviada, setMensagemEnviada] = useState(MSG_RECUPERACAO_ENVIADO);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);

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
      const data = await solicitarRecuperacaoSenha(loginTrim);
      const mensagem = data.mensagem?.trim() || MSG_RECUPERACAO_ENVIADO;
      setMensagemEnviada(mensagem);
      setPasso("enviado");
    } catch (err: unknown) {
      const status = statusHttpRecuperacao(err);
      setErroRecuperacao(
        getMensagemErroRecuperacao(
          err,
          status === 429 ? MSG_RECUPERACAO_429 : "Não foi possível solicitar a redefinição.",
        ),
      );
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

        {passo === "form" && (
          <form className="page-login__form" onSubmit={(ev) => void solicitarLink(ev)}>
            <p className="page-login__recuperacao-helper">
              Informe seu login. Se a conta existir e tiver e-mail cadastrado, você receberá as
              instruções.
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
            <p className="page-login__recuperacao-helper">{mensagemEnviada}</p>
            <div className="modal__botoes">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onConcluido(mensagemEnviada)}
              >
                Voltar para login
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
