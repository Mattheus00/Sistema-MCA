import type { ReactNode } from "react";

type ModalOverlayProps = {
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
  dismissDisabled?: boolean;
};

export default function ModalOverlay({
  children,
  onDismiss,
  className = "modal-overlay",
  dismissDisabled = false,
}: ModalOverlayProps) {
  return (
    <div className={className}>
      {onDismiss ? (
        <button
          type="button"
          className="modal-overlay__dismiss"
          aria-label="Fechar"
          disabled={dismissDisabled}
          onClick={onDismiss}
        />
      ) : null}
      {children}
    </div>
  );
}
