package com.pucminas.sgi.dto.response;

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
public class PortalDividaDTO {
    private UUID dividaId;
    private String protocolo;
    private String descricao;
    private String competencia;
    private LocalDate vencimento;
    private BigDecimal valorOriginal;
    private BigDecimal valorDevedor;
    private BigDecimal juros;
    private String status;
    private int diasAtraso;
    private List<PortalPagamentoDTO> pagamentos;
}
