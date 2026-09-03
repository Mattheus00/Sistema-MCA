package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tarefa_checklist", indexes = {
        @Index(name = "idx_tarefa_checklist_tarefa", columnList = "tarefa_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TarefaChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tarefa_id", nullable = false)
    private Tarefa tarefa;

    @Column(name = "tarefa_id", insertable = false, updatable = false)
    private UUID tarefaId;

    @Column(nullable = false, length = 500)
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private boolean concluido = false;

    @Column(nullable = false)
    @Builder.Default
    private int ordem = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

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
}
