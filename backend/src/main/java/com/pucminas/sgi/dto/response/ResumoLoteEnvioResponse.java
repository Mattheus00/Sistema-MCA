package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoLoteEnvioResponse {

    private int total;
    private int identificados;
    private int aguardandoCorrecao;
    private int semEmail;
    private int duplicados;
    private int prontosParaEnvio;
    private int ignorados;
    private int enviados;
    private int erros;
    private int bloqueados;
}
