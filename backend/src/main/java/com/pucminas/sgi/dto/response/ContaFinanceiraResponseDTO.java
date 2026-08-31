package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.TipoContaFinanceira;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContaFinanceiraResponseDTO {

    private UUID id;
    private String nome;
    private TipoContaFinanceira tipo;
    private BigDecimal saldoInicial;
    private boolean ativo;
    private LocalDateTime criadoEm;
}
