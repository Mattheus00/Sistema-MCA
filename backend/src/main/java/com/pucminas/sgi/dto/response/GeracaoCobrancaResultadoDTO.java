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
public class GeracaoCobrancaResultadoDTO {
    private String competencia;
    private Integer clientesAnalisados;
    private Integer cobrancasMensaisCriadas;
    private Integer taxasBalancoCriadas;
    private Integer duplicidadesIgnoradas;
    private Integer erros;
    private List<GeracaoCobrancaItemDTO> detalhes;
}
