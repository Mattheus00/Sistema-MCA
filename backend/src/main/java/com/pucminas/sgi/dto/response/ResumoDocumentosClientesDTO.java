package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoDocumentosClientesDTO {
    private long recebidos;
    /** Alias para o frontend (documentos novos aguardando triagem). */
    private long pendentes;
    private long novos;
    private long emAnalise;
    private long arquivados;
}
