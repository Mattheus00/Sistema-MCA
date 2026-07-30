package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "auditoria_operacao", indexes = {
        @Index(name = "idx_auditoria_acao", columnList = "acao"),
        @Index(name = "idx_auditoria_entidade", columnList = "entidade,entidadeId"),
        @Index(name = "idx_auditoria_criado_em", columnList = "criadoEm")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditoriaOperacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID auditoriaId;

    @Column(nullable = false)
    private String acao;

    @Column(nullable = false)
    private String entidade;

    private String entidadeId;

    @Column(length = 1000)
    private String detalhes;

    @Column(nullable = false)
    private String usuario;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
