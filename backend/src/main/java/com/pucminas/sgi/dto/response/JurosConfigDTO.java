package com.pucminas.sgi.dto.response;

import jakarta.validation.constraints.PositiveOrZero;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JurosConfigDTO {

    @PositiveOrZero(message = "Taxas não podem ser negativas")
    private BigDecimal multaDiaria;
    @PositiveOrZero(message = "Taxas não podem ser negativas")
    private BigDecimal capMultaPercentual;
    @PositiveOrZero(message = "Taxas não podem ser negativas")
    private BigDecimal jurosMensal;
}

