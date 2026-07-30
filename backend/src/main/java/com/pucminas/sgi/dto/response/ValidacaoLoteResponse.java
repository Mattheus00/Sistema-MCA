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
public class ValidacaoLoteResponse {

    private UUID loteId;
    private boolean podeEnviar;
    private ResumoLoteEnvioResponse resumo;
    private List<ItemEnvioBoletoResponse> itens;
    private List<String> bloqueiosGerais;
}
