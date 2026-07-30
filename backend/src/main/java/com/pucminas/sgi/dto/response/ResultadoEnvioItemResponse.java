package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusEnvioBoleto;
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
public class ResultadoEnvioItemResponse {

    private UUID envioBoletoId;
    private UUID clienteId;
    private String clienteNome;
    private String emailDestinatario;
    private String nomeArquivoOriginal;
    private StatusEnvioBoleto status;
    private Boolean simulado;
    private Boolean reenvio;
    private String mensagemErro;
    private LocalDateTime dataEnvio;
}
