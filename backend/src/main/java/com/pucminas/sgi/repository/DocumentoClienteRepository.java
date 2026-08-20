package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentoClienteRepository extends JpaRepository<DocumentoCliente, UUID> {

    Page<DocumentoCliente> findByCliente_ClienteIdOrderByEnviadoEmDesc(UUID clienteId, Pageable pageable);

    @Query("""
            SELECT d FROM DocumentoCliente d
            WHERE (:clienteId IS NULL OR d.cliente.clienteId = :clienteId)
            AND (:status IS NULL OR d.status = :status)
            AND (:tipo IS NULL OR d.tipo = :tipo)
            ORDER BY d.enviadoEm DESC
            """)
    Page<DocumentoCliente> buscar(
            @Param("clienteId") UUID clienteId,
            @Param("status") StatusDocumentoCliente status,
            @Param("tipo") TipoDocumentoCliente tipo,
            Pageable pageable);

    Optional<DocumentoCliente> findByDocumentoIdAndCliente_ClienteId(UUID documentoId, UUID clienteId);

    long countByStatus(StatusDocumentoCliente status);
}
