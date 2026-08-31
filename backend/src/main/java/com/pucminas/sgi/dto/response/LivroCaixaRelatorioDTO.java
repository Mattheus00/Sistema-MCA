package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaRelatorioDTO {

    private String periodoDescricao;
    private BigDecimal saldoInicial;
    private BigDecimal totalEntradas;
    private BigDecimal totalSaidas;
    private BigDecimal saldoFinal;
    private List<LivroCaixaMovimentacaoResponseDTO> movimentacoes;
}
