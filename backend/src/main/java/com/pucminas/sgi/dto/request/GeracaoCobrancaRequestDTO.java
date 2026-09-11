package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.Max;

import jakarta.validation.constraints.Min;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeracaoCobrancaRequestDTO {
    /** Competência no formato yyyy-MM. */
    private String competencia;

    /** Ano usado para taxa de balanço manual. */
    @Min(value = 1, message = "Ano deve ser positivo")
    @Max(value = 9999, message = "Ano deve ter até quatro dígitos")
    private Integer ano;
}
