package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
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
public class LivroCaixaCategoriaResponseDTO {

    private UUID id;
    private String nome;
    private LivroCaixaTipoMovimentacao tipo;
    private boolean ativo;
    private LocalDateTime criadoEm;
}
