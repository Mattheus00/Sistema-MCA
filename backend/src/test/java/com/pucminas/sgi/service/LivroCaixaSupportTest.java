package com.pucminas.sgi.service;

import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class LivroCaixaSupportTest {

    @Test
    void reaisParaCentavos_converteCorretamente() {
        assertEquals(new BigDecimal("150000"), LivroCaixaSupport.reaisParaCentavos(new BigDecimal("1500.00")));
    }

    @Test
    void validarStatus_entradaAceitaRecebido() {
        assertDoesNotThrow(() -> LivroCaixaSupport.validarStatusParaTipo(
                LivroCaixaTipoMovimentacao.ENTRADA, LivroCaixaStatusMovimentacao.RECEBIDO));
    }

    @Test
    void validarStatus_saidaRejeitaRecebido() {
        assertThrows(Exception.class, () -> LivroCaixaSupport.validarStatusParaTipo(
                LivroCaixaTipoMovimentacao.SAIDA, LivroCaixaStatusMovimentacao.RECEBIDO));
    }
}
