package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.PositiveOrZero;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Body do PATCH /api/inadimplentes/:id - confirmar pagamento.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InadimplenciaStatusDTO {
    private String status; // "Pago"
    /** Desconto concedido em REAIS (ex.: 100.50). */
    @PositiveOrZero(message = "Desconto não pode ser negativo")
    private BigDecimal desconto;
    /** Obrigatório na confirmação do pagamento. */
    private String metodoPagamento;
    /** Opcional. */
    private String observacao;
    /** Opcional; se ausente, backend usa hoje. */
    private LocalDate dataPagamento;
}
