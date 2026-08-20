package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.ClientePortalCredencial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientePortalCredencialRepository extends JpaRepository<ClientePortalCredencial, UUID> {

    Optional<ClientePortalCredencial> findByCliente_ClienteId(UUID clienteId);

    boolean existsByCliente_ClienteId(UUID clienteId);
}
