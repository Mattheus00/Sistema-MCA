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
public class LivroCaixaHistoricoResponseDTO {

    private UUID id;
    private String usuario;
    private String campo;
    private String valorAnterior;
    private String valorNovo;
    private String detalhes;
    private LocalDateTime criadoEm;
}
