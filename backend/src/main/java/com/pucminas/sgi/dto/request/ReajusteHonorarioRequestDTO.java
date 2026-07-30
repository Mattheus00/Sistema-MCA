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
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReajusteHonorarioRequestDTO {

    @NotNull(message = "Percentual de reajuste é obrigatório")
    @DecimalMin(value = "0.0001", message = "Percentual de reajuste deve ser maior que zero")
    private BigDecimal percentualReajuste;

    @NotNull(message = "Data de início da nova vigência é obrigatória")
    private LocalDate dataInicioVigencia;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    private String observacao;

    @Builder.Default
    private Boolean aplicarTodos = false;

    private List<UUID> clienteIds;
}
