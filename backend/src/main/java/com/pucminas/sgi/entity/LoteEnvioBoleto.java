package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lote_envio_boleto", indexes = {
        @Index(name = "idx_lote_boleto_status", columnList = "status"),
        @Index(name = "idx_lote_boleto_usuario", columnList = "usuario_responsavel_id"),
        @Index(name = "idx_lote_boleto_criado", columnList = "criadoEm")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteEnvioBoleto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID loteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_responsavel_id", nullable = false)
    private Usuario usuarioResponsavel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusLoteEnvioBoleto status = StatusLoteEnvioBoleto.EM_ANALISE;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadeTotal = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadeIdentificada = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadePendente = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadeEnviada = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidadeComErro = 0;

    private LocalDateTime dataConfirmacao;
    private LocalDateTime dataFinalizacao;

    @Version
    private Long version;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "lote", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EnvioBoleto> itens = new ArrayList<>();

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
