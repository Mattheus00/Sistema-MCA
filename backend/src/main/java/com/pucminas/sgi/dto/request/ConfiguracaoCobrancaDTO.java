package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracaoCobrancaDTO {

    @NotNull(message = "Informe se a cobrança recorrente está ativa")
    private Boolean cobrancaRecorrenteAtiva;

    @NotNull(message = "Dia de vencimento é obrigatório")
    @Min(value = 1, message = "Dia de vencimento deve estar entre 1 e 31")
    @Max(value = 31, message = "Dia de vencimento deve estar entre 1 e 31")
    private Integer diaVencimento;

    @NotNull(message = "Informe se a taxa de balanço está ativa")
    private Boolean taxaBalancoAtiva;
}
