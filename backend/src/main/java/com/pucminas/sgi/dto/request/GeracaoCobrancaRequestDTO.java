package com.pucminas.sgi.dto.request;

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
    private Integer ano;
}
