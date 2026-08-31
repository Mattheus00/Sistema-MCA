package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.TipoContaFinanceira;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conta_financeira", indexes = {
        @Index(name = "idx_conta_financeira_ativo", columnList = "ativo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContaFinanceira {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoContaFinanceira tipo;

    /** Saldo inicial em centavos. */
    @Column(nullable = false, precision = 19, scale = 0)
    @Builder.Default
    private BigDecimal saldoInicialCentavos = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        if (saldoInicialCentavos == null) {
            saldoInicialCentavos = BigDecimal.ZERO;
        }
    }
}
