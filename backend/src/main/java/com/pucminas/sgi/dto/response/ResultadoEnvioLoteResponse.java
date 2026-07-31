package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultadoEnvioLoteResponse {

    private UUID loteId;
    private StatusLoteEnvioBoleto status;
    private LocalDateTime criadoEm;
    private LocalDateTime dataFinalizacao;
    private Integer quantidadeTotal;
    private Integer quantidadeEnviada;
    private Integer quantidadeComErro;
    private Integer quantidadeNaoEnviada;
    private List<ResultadoEnvioItemResponse> enviados;
    private List<ResultadoEnvioItemResponse> comErro;
    private List<ResultadoEnvioItemResponse> naoEnviados;
}
