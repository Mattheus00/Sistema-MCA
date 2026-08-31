package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentoClienteRepository extends JpaRepository<DocumentoCliente, UUID>,
        JpaSpecificationExecutor<DocumentoCliente> {

    Page<DocumentoCliente> findByCliente_ClienteIdOrderByEnviadoEmDesc(UUID clienteId, Pageable pageable);

    Optional<DocumentoCliente> findByDocumentoIdAndCliente_ClienteId(UUID documentoId, UUID clienteId);

    long countByStatus(StatusDocumentoCliente status);
}
