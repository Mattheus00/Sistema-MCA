package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaAnaliseDTO {

    private List<LivroCaixaGraficoMensalItemDTO> entradasSaidasMensais;
    private List<LivroCaixaGraficoCategoriaItemDTO> despesasPorCategoria;
    private List<LivroCaixaFluxoCaixaItemDTO> fluxoCaixa;
}
