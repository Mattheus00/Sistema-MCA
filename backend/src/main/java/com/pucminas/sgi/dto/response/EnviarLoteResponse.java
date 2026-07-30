package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnviarLoteResponse {

    private UUID loteId;
    private String statusLote;
    private int totalProcessados;
    private int enviados;
    private int erros;
    private int ignorados;
    private List<ResultadoEnvioItemResponse> resultados;
}
