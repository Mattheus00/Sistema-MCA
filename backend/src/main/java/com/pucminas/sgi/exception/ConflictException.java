package com.pucminas.sgi.exception;

/**
 * Conflito de estado concorrente (HTTP 409), por exemplo lote já em envio.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
