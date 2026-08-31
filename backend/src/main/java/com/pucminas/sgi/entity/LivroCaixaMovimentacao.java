package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "livro_caixa_movimentacao", indexes = {
        @Index(name = "idx_lc_mov_tipo", columnList = "tipo"),
        @Index(name = "idx_lc_mov_status", columnList = "status"),
        @Index(name = "idx_lc_mov_data", columnList = "dataMovimentacao"),
        @Index(name = "idx_lc_mov_vencimento", columnList = "dataVencimento"),
        @Index(name = "idx_lc_mov_cliente", columnList = "cliente_id"),
        @Index(name = "idx_lc_mov_origem", columnList = "origem,origemId")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_lc_mov_origem", columnNames = {"origem", "origem_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivroCaixaMovimentacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LivroCaixaTipoMovimentacao tipo;

    @Column(nullable = false, length = 300)
    private String descricao;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorCentavos;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private LivroCaixaCategoria categoria;

    @Column(name = "categoria_id", insertable = false, updatable = false)
    private UUID categoriaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(name = "cliente_id", insertable = false, updatable = false)
    private UUID clienteId;

    @Column(nullable = false)
    private LocalDate dataMovimentacao;

    private LocalDate dataVencimento;

    /** Data efetiva de pagamento ou recebimento. */
    private LocalDate dataPagamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LivroCaixaStatusMovimentacao status;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private FormaPagamentoLivroCaixa formaPagamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_id")
    private ContaFinanceira conta;

    @Column(name = "conta_id", insertable = false, updatable = false)
    private UUID contaId;

    @Column(length = 2000)
    private String observacao;

    @Column(length = 200)
    private String fornecedor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LivroCaixaOrigemMovimentacao origem = LivroCaixaOrigemMovimentacao.MANUAL;

    private UUID origemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorrencia_id")
    private LivroCaixaRecorrencia recorrencia;

    @Column(name = "recorrencia_id", insertable = false, updatable = false)
    private UUID recorrenciaId;

    @Column(nullable = false, updatable = false, length = 80)
    private String criadoPor;

    @Column(length = 80)
    private String atualizadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    private LocalDateTime canceladoEm;

    @PrePersist
    protected void onCreate() {
        LocalDateTime agora = LocalDateTime.now();
        criadoEm = agora;
        atualizadoEm = agora;
    }

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = LocalDateTime.now();
    }

    public boolean isRealizado() {
        if (tipo == LivroCaixaTipoMovimentacao.ENTRADA) {
            return status == LivroCaixaStatusMovimentacao.RECEBIDO;
        }
        return status == LivroCaixaStatusMovimentacao.PAGO;
    }

    public boolean isPrevisto() {
        return status == LivroCaixaStatusMovimentacao.PREVISTO;
    }

    public boolean isCancelado() {
        return status == LivroCaixaStatusMovimentacao.CANCELADO;
    }
}
