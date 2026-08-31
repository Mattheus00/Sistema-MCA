package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaMovimentacaoDetalheDTO {

    private LivroCaixaMovimentacaoResponseDTO movimentacao;
    private List<LivroCaixaAnexoResponseDTO> anexos;
    private List<LivroCaixaHistoricoResponseDTO> historico;
}
