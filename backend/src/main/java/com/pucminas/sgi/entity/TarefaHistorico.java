package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tarefa_historico", indexes = {
        @Index(name = "idx_tarefa_historico_tarefa", columnList = "tarefa_id"),
        @Index(name = "idx_tarefa_historico_criado", columnList = "criadoEm")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TarefaHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tarefa_id", nullable = false)
    private Tarefa tarefa;

    @Column(name = "tarefa_id", insertable = false, updatable = false)
    private UUID tarefaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "usuario_id", insertable = false, updatable = false)
    private UUID usuarioId;

    @Column(nullable = false, length = 80)
    private String acao;

    @Column(nullable = false, length = 1000)
    private String descricao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
