package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "livro_caixa_recorrencia", indexes = {
        @Index(name = "idx_lc_rec_ativo", columnList = "ativo"),
        @Index(name = "idx_lc_rec_proxima", columnList = "proximaGeracao")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivroCaixaRecorrencia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 300)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LivroCaixaTipoMovimentacao tipo;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorCentavos;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private LivroCaixaCategoria categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_id")
    private ContaFinanceira conta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(length = 200)
    private String fornecedor;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private FormaPagamentoLivroCaixa formaPagamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LivroCaixaRecorrenciaTipo recorrencia;

    /** Intervalo em dias para PERSONALIZADA. */
    private Integer intervaloDias;

    @Column(nullable = false)
    private LocalDate dataInicio;

    private LocalDate dataFim;

    @Column(nullable = false)
    private LocalDate proximaGeracao;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(length = 2000)
    private String observacao;

    @Column(nullable = false, updatable = false, length = 80)
    private String criadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
