package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortalExtratoDTO {
    private PortalMeResponseDTO cliente;
    private List<PortalDividaDTO> dividasAbertas;
    private List<PortalPagamentoDTO> historicoPagamentos;
}
