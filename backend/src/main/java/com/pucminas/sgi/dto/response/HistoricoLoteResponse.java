package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
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
public class HistoricoLoteResponse {

    private UUID loteId;
    private StatusLoteEnvioBoleto status;
    private String usuarioResponsavelNome;
    private Integer quantidadeTotal;
    private Integer quantidadeEnviada;
    private Integer quantidadeComErro;
    private LocalDateTime criadoEm;
    private LocalDateTime dataFinalizacao;
}
