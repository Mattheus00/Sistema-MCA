package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "documento_cliente", indexes = {
        @Index(name = "idx_documento_cliente_cliente", columnList = "cliente_id"),
        @Index(name = "idx_documento_cliente_divida", columnList = "divida_id"),
        @Index(name = "idx_documento_cliente_status", columnList = "status"),
        @Index(name = "idx_documento_cliente_enviado", columnList = "enviadoEm")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentoCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID documentoId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divida_id")
    private Divida divida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoDocumentoCliente tipo;

    @Column(nullable = false)
    private String nomeOriginal;

    @Column(nullable = false)
    private String nomeArmazenado;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private long tamanhoBytes;

    @Column(nullable = false, length = 64)
    private String hashSha256;

    @Column(columnDefinition = "TEXT")
    private String observacaoCliente;

    @Column(columnDefinition = "TEXT")
    private String respostaEscritorio;

    private LocalDateTime respondidoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "respondido_por_id")
    private Usuario respondidoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusDocumentoCliente status = StatusDocumentoCliente.RECEBIDO;

    @Column(nullable = false, updatable = false)
    private LocalDateTime enviadoEm;

    @PrePersist
    protected void onCreate() {
        if (enviadoEm == null) {
            enviadoEm = LocalDateTime.now();
        }
    }
}
