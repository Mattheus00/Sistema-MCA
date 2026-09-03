package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tarefa", indexes = {
        @Index(name = "idx_tarefa_responsavel", columnList = "responsavel_id"),
        @Index(name = "idx_tarefa_status", columnList = "status"),
        @Index(name = "idx_tarefa_prioridade", columnList = "prioridade"),
        @Index(name = "idx_tarefa_vencimento", columnList = "dataVencimento"),
        @Index(name = "idx_tarefa_ordem", columnList = "status,ordemKanban")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tarefa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 300)
    private String titulo;

    @Column(length = 4000)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusTarefa status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadeTarefa prioridade;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsavel_id", nullable = false)
    private Usuario responsavel;

    @Column(name = "responsavel_id", insertable = false, updatable = false)
    private UUID responsavelId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criado_por_id", nullable = false)
    private Usuario criadoPor;

    @Column(name = "criado_por_id", insertable = false, updatable = false)
    private UUID criadoPorId;

    private LocalDate dataInicio;

    private LocalDate dataVencimento;

    @Column(length = 120)
    private String categoria;

    @Column(nullable = false)
    @Builder.Default
    private int ordemKanban = 0;

    @Column(length = 2000)
    private String observacoes;

    private LocalDateTime concluidoEm;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "tarefa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    @Builder.Default
    private List<TarefaChecklistItem> checklist = new ArrayList<>();

    @OneToMany(mappedBy = "tarefa", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("criadoEm DESC")
    @Builder.Default
    private List<TarefaHistorico> historico = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime agora = LocalDateTime.now();
        criadoEm = agora;
        atualizadoEm = agora;
        if (status == null) {
            status = StatusTarefa.A_FAZER;
        }
        if (prioridade == null) {
            prioridade = PrioridadeTarefa.MEDIA;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
