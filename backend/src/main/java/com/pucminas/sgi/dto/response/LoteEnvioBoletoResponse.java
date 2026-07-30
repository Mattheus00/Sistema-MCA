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
public class LoteEnvioBoletoResponse {

    private UUID loteId;
    private StatusLoteEnvioBoleto status;
    private UUID usuarioResponsavelId;
    private String usuarioResponsavelNome;
    private Integer quantidadeTotal;
    private Integer quantidadeIdentificada;
    private Integer quantidadePendente;
    private Integer quantidadeEnviada;
    private Integer quantidadeComErro;
    private LocalDateTime criadoEm;
    private LocalDateTime dataConfirmacao;
    private LocalDateTime dataFinalizacao;
    private List<ItemEnvioBoletoResponse> itens;
    private ResumoLoteEnvioResponse resumo;
}
