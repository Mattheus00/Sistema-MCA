import { useEffect } from "react";

let lockCount = 0;
let overflowAnterior = "";

/**
 * Bloqueia o scroll do `body` enquanto `travado` for verdadeiro.
 * Usa contador de referências para vários modais abertos ao mesmo tempo.
 */
export function useBodyScrollLock(travado: boolean): void {
  useEffect(() => {
    if (!travado) return;
    if (lockCount === 0) {
      overflowAnterior = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = overflowAnterior;
      }
    };
  }, [travado]);
}
