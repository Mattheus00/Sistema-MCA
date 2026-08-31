package com.pucminas.sgi.enums;

public enum StatusDocumentoCliente {
    RECEBIDO,
    EM_ANALISE,
    ARQUIVADO;

    /** Aceita alias do frontend (ENVIADO = documento novo aguardando triagem). */
    public static StatusDocumentoCliente fromQuery(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if ("ENVIADO".equals(normalized) || "NOVO".equals(normalized) || "PENDENTE".equals(normalized)) {
            return RECEBIDO;
        }
        return StatusDocumentoCliente.valueOf(normalized);
    }
}
