package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaOrigemMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.util.MoneyUtil;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public final class LivroCaixaSupport {

    private LivroCaixaSupport() {
    }

    public static BigDecimal reaisParaCentavos(BigDecimal reais) {
        if (reais == null) {
            throw new BusinessRuleException("Valor é obrigatório.");
        }
        return reais.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);
    }

    public static BigDecimal centavosParaReais(BigDecimal centavos) {
        return MoneyUtil.centavosParaReais(centavos);
    }

    public static void validarStatusParaTipo(LivroCaixaTipoMovimentacao tipo, LivroCaixaStatusMovimentacao status) {
        if (tipo == null || status == null) {
            throw new BusinessRuleException("Tipo e status são obrigatórios.");
        }
        if (tipo == LivroCaixaTipoMovimentacao.ENTRADA) {
            if (status != LivroCaixaStatusMovimentacao.PREVISTO
                    && status != LivroCaixaStatusMovimentacao.RECEBIDO
                    && status != LivroCaixaStatusMovimentacao.CANCELADO) {
                throw new BusinessRuleException("Status inválido para entrada. Use PREVISTO, RECEBIDO ou CANCELADO.");
            }
        } else if (status != LivroCaixaStatusMovimentacao.PREVISTO
                && status != LivroCaixaStatusMovimentacao.PAGO
                && status != LivroCaixaStatusMovimentacao.CANCELADO) {
            throw new BusinessRuleException("Status inválido para saída. Use PREVISTO, PAGO ou CANCELADO.");
        }
    }

    public static boolean isRealizado(LivroCaixaMovimentacao mov) {
        if (mov.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA) {
            return mov.getStatus() == LivroCaixaStatusMovimentacao.RECEBIDO;
        }
        return mov.getStatus() == LivroCaixaStatusMovimentacao.PAGO;
    }

    public static boolean isEditavel(LivroCaixaMovimentacao mov) {
        return mov.getOrigem() == LivroCaixaOrigemMovimentacao.MANUAL
                || mov.getOrigem() == LivroCaixaOrigemMovimentacao.RECORRENTE;
    }

    public static boolean isVencido(LivroCaixaMovimentacao mov) {
        if (mov.getStatus() != LivroCaixaStatusMovimentacao.PREVISTO || mov.getDataVencimento() == null) {
            return false;
        }
        return mov.getDataVencimento().isBefore(LocalDate.now());
    }

    public static boolean isProximoVencimento(LivroCaixaMovimentacao mov) {
        if (mov.getStatus() != LivroCaixaStatusMovimentacao.PREVISTO || mov.getDataVencimento() == null) {
            return false;
        }
        LocalDate hoje = LocalDate.now();
        return !mov.getDataVencimento().isBefore(hoje)
                && !mov.getDataVencimento().isAfter(hoje.plusDays(7));
    }
}
