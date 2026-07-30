package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HonorarioClienteResponseDTO {
    private UUID honorarioId;
    private UUID clienteId;
    private String clienteNome;
    private BigDecimal valor;
    private LocalDate dataInicioVigencia;
    private LocalDate dataFimVigencia;
    private BigDecimal percentualReajuste;
    private String observacao;
    private LocalDateTime criadoEm;
    private String criadoPor;
    private Boolean ativo;
}
