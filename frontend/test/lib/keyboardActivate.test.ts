import { describe, it, expect, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { onActivateKeyDown } from "@/lib/keyboardActivate";

function fakeEvent(key: string): KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  return { key, preventDefault } as unknown as KeyboardEvent & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
}

describe("keyboardActivate", () => {
  it("dispara ação com Enter sem preventDefault", () => {
    const action = vi.fn();
    const e = fakeEvent("Enter");
    onActivateKeyDown(e, action);
    expect(action).toHaveBeenCalledOnce();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("dispara ação com Space e previne o scroll", () => {
    const action = vi.fn();
    const e = fakeEvent(" ");
    onActivateKeyDown(e, action);
    expect(action).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalledOnce();
  });

  it("ignora outras teclas", () => {
    const action = vi.fn();
    onActivateKeyDown(fakeEvent("Tab"), action);
    expect(action).not.toHaveBeenCalled();
  });
});
