package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaResumoColaboradorDTO {

    private UUID usuarioId;
    private String nome;
    private long totalTarefas;
    private long atrasadas;
    private long emAndamento;
    private long concluidas;
}
