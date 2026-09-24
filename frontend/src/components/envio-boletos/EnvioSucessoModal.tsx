import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  SendIcon,
} from "@/components/envio-boletos/EnvioBoletosIcons";
import type { CardsResumoEnvio } from "@/hooks/envioBoletosTypes";

type EstiloParticula = CSSProperties & {
  "--dx": string;
  "--dy": string;
};

const PARTICULAS = [
  { dx: "32px", dy: "-40px" },
  { dx: "-28px", dy: "-36px" },
  { dx: "42px", dy: "8px" },
  { dx: "-40px", dy: "12px" },
  { dx: "18px", dy: "38px" },
  { dx: "-16px", dy: "36px" },
  { dx: "8px", dy: "-48px" },
  { dx: "-6px", dy: "-44px" },
] as const;

type EnvioSucessoModalProps = {
  cards: CardsResumoEnvio;
  onFechar: () => void;
};

function textoQuantidadeEnviados(quantidade: number): string {
  if (quantidade === 1) return "1 e-mail enviado.";
  return `${quantidade} e-mails enviados.`;
}

export default function EnvioSucessoModal({ cards, onFechar }: EnvioSucessoModalProps) {
  useBodyScrollLock(true);

  const comAvisos = cards.erros > 0;
  const titulo = comAvisos ? "Envio concluído com avisos" : "Boletos enviados com sucesso";

  return createPortal(
    <ModalOverlay className="modal-overlay modal-overlay--blur" onDismiss={onFechar}>
      <div
        className={`modal modal-envio-confirmacao modal-envio-sucesso${comAvisos ? " modal-envio-sucesso--avisos" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-envio-sucesso-titulo"
        aria-describedby="modal-envio-sucesso-subtitulo"
      >
        <button
          type="button"
          className="modal-envio-confirmacao__close"
          onClick={onFechar}
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>

        <div className="modal-envio-sucesso__celebracao" aria-hidden="true">
          <span className="modal-envio-sucesso__burst">
            {PARTICULAS.map((particula) => (
              <span
                key={`${particula.dx}-${particula.dy}`}
                className="modal-envio-sucesso__particle"
                style={{ "--dx": particula.dx, "--dy": particula.dy } as EstiloParticula}
              />
            ))}
          </span>
          <span className="modal-envio-sucesso__check">
            {comAvisos ? <AlertTriangleIcon /> : <CheckCircleIcon />}
          </span>
        </div>

        <header className="modal-envio-sucesso__header">
          <h2 id="modal-envio-sucesso-titulo" className="modal-envio-confirmacao__title">
            {titulo}
          </h2>
          <p id="modal-envio-sucesso-subtitulo" className="modal-envio-confirmacao__subtitle">
            {textoQuantidadeEnviados(cards.enviados)}
          </p>
        </header>

        <div className="modal-envio-confirmacao__resumo">
          <p className="modal-envio-confirmacao__resumo-titulo">Resumo do envio</p>
          <div className="modal-envio-confirmacao__resumo-cards modal-envio-sucesso__cards">
            <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--verde">
              <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                <SendIcon />
              </span>
              <div>
                <span className="modal-envio-confirmacao__resumo-label">Enviados</span>
                <strong className="modal-envio-confirmacao__resumo-valor">{cards.enviados}</strong>
              </div>
            </div>
            <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--laranja">
              <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                <AlertTriangleIcon />
              </span>
              <div>
                <span className="modal-envio-confirmacao__resumo-label">Erros</span>
                <strong className="modal-envio-confirmacao__resumo-valor">{cards.erros}</strong>
              </div>
            </div>
          </div>
        </div>

        <footer className="modal-envio-confirmacao__footer">
          <button
            type="button"
            className="btn btn--primary modal-envio-confirmacao__btn-confirmar"
            onClick={onFechar}
          >
            Ver detalhes do envio
          </button>
        </footer>
      </div>
    </ModalOverlay>,
    document.body,
  );
}
