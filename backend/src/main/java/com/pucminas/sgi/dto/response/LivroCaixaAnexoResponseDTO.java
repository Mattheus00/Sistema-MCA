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
public class LivroCaixaAnexoResponseDTO {

    private UUID id;
    private String nomeOriginal;
    private long tamanhoBytes;
    private String contentType;
    private String enviadoPor;
    private LocalDateTime criadoEm;
}
