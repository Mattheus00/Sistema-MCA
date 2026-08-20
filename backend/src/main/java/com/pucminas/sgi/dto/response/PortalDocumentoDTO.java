package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
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
public class PortalDocumentoDTO {
    private UUID documentoId;
    private UUID clienteId;
    private String clienteNome;
    private String clienteCodigo;
    private UUID dividaId;
    private String protocoloDivida;
    private TipoDocumentoCliente tipo;
    private StatusDocumentoCliente status;
    private String nomeOriginal;
    private String contentType;
    private long tamanhoBytes;
    private String observacaoCliente;
    private String respostaEscritorio;
    private LocalDateTime respondidoEm;
    private String respondidoPorNome;
    private LocalDateTime enviadoEm;
}
