package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaChecklistItemResponseDTO {

    private UUID id;
    private String descricao;
    private boolean concluido;
    private int ordem;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}
