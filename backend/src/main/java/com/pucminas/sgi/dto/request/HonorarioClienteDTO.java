package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HonorarioClienteDTO {

    /** Valor em reais. O backend persiste em centavos. */
    @NotNull(message = "Valor do honorário é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor do honorário deve ser maior que zero")
    private BigDecimal valor;

    @NotNull(message = "Data de início da vigência é obrigatória")
    private LocalDate dataInicioVigencia;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    private String observacao;
}
