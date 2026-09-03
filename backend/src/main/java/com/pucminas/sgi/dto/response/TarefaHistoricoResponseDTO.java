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
public class TarefaHistoricoResponseDTO {

    private UUID id;
    private UUID usuarioId;
    private String usuarioNome;
    private String acao;
    private String descricao;
    private LocalDateTime criadoEm;
}
