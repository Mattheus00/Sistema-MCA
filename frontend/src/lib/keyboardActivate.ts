import type { KeyboardEvent } from "react";

/** Ativa a ação com Enter ou Space (preventDefault no Space, como em botões nativos). */
export function onActivateKeyDown(e: KeyboardEvent, action: () => void): void {
  if (e.key === "Enter") {
    action();
    return;
  }
  if (e.key === " ") {
    e.preventDefault();
    action();
  }
}
