package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
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
public class ItemEnvioBoletoResponse {

    private UUID envioBoletoId;
    private UUID clienteId;
    private String clienteNome;
    private String documentoMascarado;
    private String nomeArquivoOriginal;
    private String emailDestinatario;
    private MetodoIdentificacaoBoleto metodoIdentificacao;
    private ConfiancaIdentificacaoBoleto confiancaIdentificacao;
    private StatusEnvioBoleto status;
    private Long tamanhoArquivo;
    private Boolean possivelDuplicidade;
    private Boolean confirmadoPeloUsuario;
    private Boolean simulado;
    private Boolean reenvio;
    private String mensagemErro;
    private String mensagemValidacao;
    private List<String> bloqueios;
    private LocalDateTime dataEnvio;
    private LocalDateTime criadoEm;
}
