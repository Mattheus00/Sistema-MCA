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
public class LivroCaixaGraficoMensalItemDTO {

    private String periodo;
    private BigDecimal entradas;
    private BigDecimal saidas;
    private BigDecimal resultado;
}
