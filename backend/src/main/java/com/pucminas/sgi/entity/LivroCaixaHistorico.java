package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "livro_caixa_historico", indexes = {
        @Index(name = "idx_lc_hist_mov", columnList = "movimentacao_id"),
        @Index(name = "idx_lc_hist_criado", columnList = "criadoEm")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivroCaixaHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movimentacao_id", nullable = false)
    private LivroCaixaMovimentacao movimentacao;

    @Column(nullable = false, length = 80)
    private String usuario;

    @Column(nullable = false, length = 80)
    private String campo;

    @Column(length = 500)
    private String valorAnterior;

    @Column(length = 500)
    private String valorNovo;

    @Column(length = 1000)
    private String detalhes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
