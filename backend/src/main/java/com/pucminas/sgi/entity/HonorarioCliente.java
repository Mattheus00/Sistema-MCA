package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "honorario_cliente", indexes = {
        @Index(name = "idx_honorario_cliente_vigencia", columnList = "cliente_id,dataInicioVigencia,dataFimVigencia"),
        @Index(name = "idx_honorario_cliente_ativo", columnList = "cliente_id,ativo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HonorarioCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID honorarioId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    /** Valor em centavos, seguindo o padrão monetário do backend. */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate dataInicioVigencia;

    private LocalDate dataFimVigencia;

    @Column(precision = 9, scale = 4)
    private BigDecimal percentualReajuste;

    @Column(length = 500)
    private String observacao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private String criadoPor;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
