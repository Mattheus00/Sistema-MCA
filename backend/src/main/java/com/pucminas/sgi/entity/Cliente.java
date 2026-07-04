package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusCliente;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidade que representa um cliente do escritório de contabilidade.
 */
@Entity
@Table(name = "cliente", indexes = {
    @Index(name = "idx_cliente_cpf_cnpj", columnList = "cpfCnpj"),
    @Index(name = "idx_cliente_email", columnList = "email"),
    @Index(name = "idx_cliente_status", columnList = "statusCliente"),
    @Index(name = "idx_cliente_codigo", columnList = "codigo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID clienteId;

    /** Código interno do cliente no escritório (único quando informado). */
    @Column
    private String codigo;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String cpfCnpj;

    private String email;
    /** Telefone fixo (8 dígitos locais ou 10 com DDD em registros legados). */
    private String telefone;
    /** Celular com DDD (10 ou 11 dígitos). */
    private String celular;
    private String endereco;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusCliente statusCliente = StatusCliente.ATIVO;

    /**
     * Saldo total devedor em centavos (soma das dívidas em aberto).
     */
    @Column(nullable = false, precision = 19, scale = 0)
    @Builder.Default
    private BigDecimal saldoDevedor = BigDecimal.ZERO;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Divida> dividas = new ArrayList<>();

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
