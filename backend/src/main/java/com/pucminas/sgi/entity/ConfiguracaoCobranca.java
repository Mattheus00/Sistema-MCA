package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "configuracao_cobranca", indexes = {
        @Index(name = "idx_config_cobranca_cliente", columnList = "cliente_id", unique = true),
        @Index(name = "idx_config_cobranca_recorrente", columnList = "cobrancaRecorrenteAtiva"),
        @Index(name = "idx_config_taxa_balanco", columnList = "taxaBalancoAtiva")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracaoCobranca {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID configuracaoId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    private Cliente cliente;

    @Column(nullable = false)
    @Builder.Default
    private boolean cobrancaRecorrenteAtiva = true;

    @Column(nullable = false)
    private Integer diaVencimento;

    @Column(nullable = false)
    @Builder.Default
    private boolean taxaBalancoAtiva = true;

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
