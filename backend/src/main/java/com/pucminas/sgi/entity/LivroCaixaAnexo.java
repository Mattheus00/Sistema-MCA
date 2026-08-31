package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "livro_caixa_anexo", indexes = {
        @Index(name = "idx_lc_anexo_mov", columnList = "movimentacao_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivroCaixaAnexo {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movimentacao_id", nullable = false)
    private LivroCaixaMovimentacao movimentacao;

    @Column(name = "movimentacao_id", insertable = false, updatable = false)
    private UUID movimentacaoId;

    @Column(nullable = false, length = 255)
    private String nomeOriginal;

    @Column(nullable = false, length = 255)
    private String nomeArmazenado;

    @Column(nullable = false, length = 64)
    private String hashSha256;

    @Column(nullable = false)
    private long tamanhoBytes;

    @Column(nullable = false, length = 120)
    private String contentType;

    @Column(nullable = false, updatable = false, length = 80)
    private String enviadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
