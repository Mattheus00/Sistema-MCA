package com.pucminas.sgi.enums;

public enum FormaPagamentoLivroCaixa {
    PIX,
    DINHEIRO,
    BOLETO,
    CARTAO_CREDITO,
    CARTAO_DEBITO,
    TRANSFERENCIA,
    DEBITO_AUTOMATICO,
    OUTRO;

    public static FormaPagamentoLivroCaixa fromMetodoPagamento(String metodo) {
        if (metodo == null || metodo.isBlank()) {
            return OUTRO;
        }
        String normalized = metodo.trim().toUpperCase();
        if (normalized.contains("PIX")) {
            return PIX;
        }
        if (normalized.contains("BOLETO")) {
            return BOLETO;
        }
        if (normalized.contains("DINHEIRO")) {
            return DINHEIRO;
        }
        if (normalized.contains("TRANSFER")) {
            return TRANSFERENCIA;
        }
        if (normalized.contains("DEBITO")) {
            return CARTAO_DEBITO;
        }
        if (normalized.contains("CREDITO")) {
            return CARTAO_CREDITO;
        }
        return OUTRO;
    }
}
