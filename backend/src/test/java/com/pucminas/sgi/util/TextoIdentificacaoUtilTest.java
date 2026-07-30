package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TextoIdentificacaoUtilTest {

    @Test
    @DisplayName("Remove acentos e stopwords")
    void normalizaNome() {
        String n = TextoIdentificacaoUtil.normalizarParaComparacao("Boleto_Cooperativa_Agropecuária_Julho.pdf");
        assertEquals("cooperativa agropecuaria", n);
    }

    @Test
    @DisplayName("Trata hífens e underscores")
    void normalizaHifens() {
        String n = TextoIdentificacaoUtil.normalizarParaComparacao("mercado-sao_lucas.pdf");
        assertEquals("mercado sao lucas", n);
    }

    @Test
    @DisplayName("Similaridade exata")
    void similaridadeExata() {
        assertEquals(1.0, TextoIdentificacaoUtil.similaridadeToken("cooperativa agro", "cooperativa agro"));
    }
}
