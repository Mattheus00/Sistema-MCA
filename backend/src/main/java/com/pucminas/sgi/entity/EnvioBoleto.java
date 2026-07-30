package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "envio_boleto", indexes = {
        @Index(name = "idx_envio_boleto_lote", columnList = "lote_id"),
        @Index(name = "idx_envio_boleto_cliente", columnList = "cliente_id"),
        @Index(name = "idx_envio_boleto_status", columnList = "status"),
        @Index(name = "idx_envio_boleto_hash", columnList = "hashArquivo"),
        @Index(name = "idx_envio_boleto_data_envio", columnList = "dataEnvio")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioBoleto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID envioBoletoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lote_id", nullable = false)
    private LoteEnvioBoleto lote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(nullable = false)
    private String nomeArquivoOriginal;

    @Column(nullable = false)
    private String nomeArquivoArmazenado;

    @Column(nullable = false, length = 64)
    private String hashArquivo;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long tamanhoArquivo;

    private String emailDestinatario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MetodoIdentificacaoBoleto metodoIdentificacao = MetodoIdentificacaoBoleto.NAO_IDENTIFICADO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ConfiancaIdentificacaoBoleto confiancaIdentificacao = ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusEnvioBoleto status = StatusEnvioBoleto.PENDENTE_ANALISE;

    private LocalDateTime dataEnvio;
    private String mensagemErro;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadeTentativas = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean confirmadoPeloUsuario = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean reenvio = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean simulado = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean possivelDuplicidade = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enviado_por_id")
    private Usuario enviadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        atualizadoEm = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
