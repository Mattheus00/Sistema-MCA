package com.pucminas.sgi.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta para o frontend: inadimplência (dívida) no contrato da API.
 * status: "EmAberto" | "Pago" | "Acordo"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InadimplenciaResponseDTO {

    @JsonProperty("id")
    private UUID dividaId;
    private UUID clienteId;
    private String clienteNome;
    /** Valor em REAIS (ex.: 1000.00 = R$ 1.000,00). Exibir direto no front. */
    private BigDecimal valor;
    private LocalDate vencimento;
    private String descricao;
    /** EmAberto | Pago | Acordo */
    private String status;
    @JsonProperty("createdAt")
    private LocalDateTime criadoEm;
    @JsonProperty("updatedAt")
    private LocalDateTime atualizadoEm;
}
