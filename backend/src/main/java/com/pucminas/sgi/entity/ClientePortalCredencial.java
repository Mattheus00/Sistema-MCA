package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusPortalCredencial;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cliente_portal_credencial", indexes = {
        @Index(name = "idx_portal_credencial_cliente", columnList = "cliente_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientePortalCredencial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID credencialId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    private Cliente cliente;

    @Column(nullable = false)
    private String senha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusPortalCredencial status = StatusPortalCredencial.ATIVO;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime ultimoAcesso;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
