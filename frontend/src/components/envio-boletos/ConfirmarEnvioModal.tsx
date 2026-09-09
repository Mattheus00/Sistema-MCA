import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  DuplicateIcon,
  MailIcon,
  UsersIcon,
} from "@/components/envio-boletos/EnvioBoletosIcons";

type ConfirmarEnvioModalProps = {
  loading: boolean;
  resumoConfirmacao: { selecionados: number; prontos: number; duplicados: number };
  permitirReenvioDuplicado: boolean;
  setPermitirReenvioDuplicado: (valor: boolean) => void;
  setModalConfirmarEnvio: (aberto: boolean) => void;
  executarEnvio: () => void;
};

export default function ConfirmarEnvioModal({
  loading,
  resumoConfirmacao,
  permitirReenvioDuplicado,
  setPermitirReenvioDuplicado,
  setModalConfirmarEnvio,
  executarEnvio,
}: ConfirmarEnvioModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div
      className="modal-overlay modal-overlay--blur"
      role="presentation"
      onClick={() => !loading && setModalConfirmarEnvio(false)}
    >
      <div
        className="modal modal-envio-confirmacao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-envio-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-envio-confirmacao__close"
          onClick={() => !loading && setModalConfirmarEnvio(false)}
          aria-label="Fechar"
          disabled={loading}
        >
          <CloseIcon />
        </button>

        <header className="modal-envio-confirmacao__header">
          <span className="modal-envio-confirmacao__icon" aria-hidden="true">
            <MailIcon />
          </span>
          <div>
            <h2 id="modal-envio-titulo" className="modal-envio-confirmacao__title">
              Confirmar envio de e-mails
            </h2>
            <p className="modal-envio-confirmacao__subtitle">
              Os e-mails reais serão enviados para os destinatários selecionados.
            </p>
          </div>
        </header>

        <div className="modal-envio-confirmacao__alerta" role="alert">
          <AlertTriangleIcon />
          <p>
            <strong>Atenção:</strong> os e-mails serão enviados de verdade para os destinatários
            selecionados. Revise cuidadosamente a conferência antes de continuar.
          </p>
        </div>

        <div className="modal-envio-confirmacao__resumo">
          <p className="modal-envio-confirmacao__resumo-titulo">Resumo do envio</p>
          <div className="modal-envio-confirmacao__resumo-cards">
            <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--roxo">
              <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                <UsersIcon />
              </span>
              <div>
                <span className="modal-envio-confirmacao__resumo-label">Selecionados</span>
                <strong className="modal-envio-confirmacao__resumo-valor">
                  {resumoConfirmacao.selecionados}
                </strong>
              </div>
            </div>
            <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--verde">
              <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                <CheckCircleIcon />
              </span>
              <div>
                <span className="modal-envio-confirmacao__resumo-label">Prontos para envio</span>
                <strong className="modal-envio-confirmacao__resumo-valor">
                  {resumoConfirmacao.prontos}
                </strong>
              </div>
            </div>
            <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--laranja">
              <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                <DuplicateIcon />
              </span>
              <div>
                <span className="modal-envio-confirmacao__resumo-label">Duplicados detectados</span>
                <strong className="modal-envio-confirmacao__resumo-valor">
                  {resumoConfirmacao.duplicados}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <label className="modal-envio-confirmacao__checkbox">
          <input
            type="checkbox"
            checked={permitirReenvioDuplicado}
            onChange={(e) => setPermitirReenvioDuplicado(e.target.checked)}
            disabled={loading}
          />
          Permitir reenvio de boletos duplicados
        </label>

        <footer className="modal-envio-confirmacao__footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setModalConfirmarEnvio(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary modal-envio-confirmacao__btn-confirmar"
            disabled={loading}
            onClick={() => executarEnvio()}
          >
            {loading ? "Enviando..." : "Confirmar envio"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
