package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaIndicadoresDTO {

    private long emAberto;
    private long emAndamento;
    private long atrasadas;
    private long concluidasNaSemana;
}
