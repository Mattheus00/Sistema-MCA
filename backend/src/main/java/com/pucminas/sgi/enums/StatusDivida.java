package com.pucminas.sgi.enums;

import java.util.List;

/**
 * Status da dívida em relação ao pagamento.
 */
public enum StatusDivida {
    EM_ABERTO,
    PARCIAL,
    QUITADA,
    VENCIDA,
    /** Inadimplência cancelada (soft delete) – não aparece na listagem. */
    CANCELADA;

    /**
     * Status que representam dívidas pendentes (ainda devidas): em aberto, parcialmente paga ou vencida.
     */
    public static List<StatusDivida> emAberto() {
        return List.of(EM_ABERTO, PARCIAL, VENCIDA);
    }
}
