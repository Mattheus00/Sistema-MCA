package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReajusteHonorarioItemDTO {
    private UUID clienteId;
    private String clienteNome;
    private BigDecimal valorAtual;
    private BigDecimal percentualAplicado;
    private BigDecimal novoValor;
    private LocalDate dataInicioVigencia;
    private Boolean elegivel;
    private String erro;
}
