package com.pucminas.sgi.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Conversões monetárias centralizadas. Valores são armazenados em centavos (BigDecimal sem casas)
 * e expostos em reais com 2 casas decimais (HALF_UP).
 */
public final class MoneyUtil {

    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    private MoneyUtil() {
    }

    /**
     * Converte centavos para reais. {@code null} ou zero resultam em {@link BigDecimal#ZERO}.
     */
    public static BigDecimal centavosParaReais(BigDecimal centavos) {
        if (centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return centavos.divide(CEM, 2, RoundingMode.HALF_UP);
    }

    /**
     * Igual a {@link #centavosParaReais(BigDecimal)}, mas retorna {@code null} quando não há valor.
     * Mantido para casos em que a ausência de valor deve ser representada como nulo.
     */
    public static BigDecimal centavosParaReaisOuNulo(BigDecimal centavos) {
        if (centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return centavos.divide(CEM, 2, RoundingMode.HALF_UP);
    }

    /**
     * Converte centavos para reais em texto com 2 casas (ex.: "152.30"), formato aceito por APIs externas.
     */
    public static String centavosParaReaisTexto(BigDecimal centavos) {
        BigDecimal reais = centavos == null ? BigDecimal.ZERO : centavos;
        return reais.divide(CEM, 2, RoundingMode.HALF_UP).toPlainString();
    }
}
