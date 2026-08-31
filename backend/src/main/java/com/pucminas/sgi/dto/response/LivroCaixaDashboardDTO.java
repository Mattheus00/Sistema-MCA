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
public class LivroCaixaDashboardDTO {

    private BigDecimal saldoRealizado;
    private BigDecimal saldoPrevisto;
    private BigDecimal entradasMes;
    private BigDecimal saidasMes;
    private BigDecimal resultadoMes;
}
