import { describe, it, expect, beforeEach } from "vitest";
import {
  PORTAL_TOKEN_KEY,
  getPortalToken,
  getPortalClientName,
  getPortalClientId,
  setPortalSession,
  clearPortalSession,
} from "@/lib/portalSession";

describe("portalSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("grava e lê sessão em localStorage", () => {
    setPortalSession({ token: "t1", clienteNome: "Ana", clienteId: "c1" }, true);
    expect(getPortalToken()).toBe("t1");
    expect(getPortalClientName()).toBe("Ana");
    expect(getPortalClientId()).toBe("c1");
    expect(sessionStorage.getItem(PORTAL_TOKEN_KEY)).toBeNull();
  });

  it("grava em sessionStorage e usa nome fallback", () => {
    setPortalSession({ token: "t2", nome: "Maria" }, false);
    expect(sessionStorage.getItem(PORTAL_TOKEN_KEY)).toBe("t2");
    expect(getPortalClientName()).toBe("Maria");
    setPortalSession({ token: "t3" }, false);
    expect(getPortalClientName()).toBe("Cliente");
  });

  it("prioriza sessionStorage e limpa os dois", () => {
    localStorage.setItem(PORTAL_TOKEN_KEY, "local");
    sessionStorage.setItem(PORTAL_TOKEN_KEY, "session");
    expect(getPortalToken()).toBe("local");
    clearPortalSession();
    expect(getPortalToken()).toBeNull();
    expect(getPortalClientName()).toBeNull();
    expect(getPortalClientId()).toBeNull();
  });
});
