package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("MoneyUtil")
class MoneyUtilTest {

    @Test
    @DisplayName("centavosParaReais converte 15050 para 150.50")
    void centavosParaReais_conversao() {
        assertEquals(new BigDecimal("150.50"), MoneyUtil.centavosParaReais(new BigDecimal("15050")));
    }

    @Test
    @DisplayName("centavosParaReais: null e zero retornam ZERO")
    void centavosParaReais_nullOuZero() {
        assertEquals(BigDecimal.ZERO, MoneyUtil.centavosParaReais(null));
        assertEquals(BigDecimal.ZERO, MoneyUtil.centavosParaReais(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("centavosParaReaisOuNulo: null e zero retornam null")
    void centavosParaReaisOuNulo() {
        assertNull(MoneyUtil.centavosParaReaisOuNulo(null));
        assertNull(MoneyUtil.centavosParaReaisOuNulo(BigDecimal.ZERO));
        assertEquals(new BigDecimal("10.00"), MoneyUtil.centavosParaReaisOuNulo(new BigDecimal("1000")));
    }

    @Test
    @DisplayName("centavosParaReaisTexto formata com duas casas")
    void centavosParaReaisTexto() {
        assertEquals("99.99", MoneyUtil.centavosParaReaisTexto(new BigDecimal("9999")));
        assertEquals("0.00", MoneyUtil.centavosParaReaisTexto(null));
    }
}
