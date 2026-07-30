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
public class ReajusteHonorarioResumoDTO {
    private Integer clientesProcessados;
    private Integer reajustesAplicados;
    private Integer erros;
    private List<ReajusteHonorarioItemDTO> detalhes;
}
