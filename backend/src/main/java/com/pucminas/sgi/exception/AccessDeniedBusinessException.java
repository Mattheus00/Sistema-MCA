package com.pucminas.sgi.exception;

/** Regra de autorização do domínio, traduzida para HTTP 403 na borda da API. */
public class AccessDeniedBusinessException extends RuntimeException {
    public AccessDeniedBusinessException(String message) { super(message); }
}
