package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.TipoContaFinanceira;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContaFinanceiraRequestDTO {

    @NotBlank
    @Size(max = 120)
    private String nome;

    @NotNull
    private TipoContaFinanceira tipo;

    /** Saldo inicial em reais (opcional). */
    private BigDecimal saldoInicial;
}
