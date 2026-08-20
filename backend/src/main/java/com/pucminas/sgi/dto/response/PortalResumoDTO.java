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
public class PortalResumoDTO {
    private BigDecimal saldoDevedorTotal;
    private int dividasAbertas;
    private int dividasVencidas;
}
