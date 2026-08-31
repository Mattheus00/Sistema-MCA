package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaFluxoCaixaItemDTO {

    private String periodo;
    private BigDecimal saldoInicial;
    private BigDecimal entradas;
    private BigDecimal saidas;
    private BigDecimal saldoFinal;
}
