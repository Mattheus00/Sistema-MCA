package com.pucminas.sgi.exception;

/**
 * Exceção lançada quando a geração de um relatório (PDF/Excel) falha (500).
 */
public class ExportacaoRelatorioException extends RuntimeException {

    public ExportacaoRelatorioException(String message, Throwable cause) {
        super(message, cause);
    }
}
