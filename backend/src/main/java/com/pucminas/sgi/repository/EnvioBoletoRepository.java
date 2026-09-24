package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnvioBoletoRepository extends JpaRepository<EnvioBoleto, UUID> {

    @Query("""
            SELECT e FROM EnvioBoleto e
            LEFT JOIN FETCH e.cliente
            WHERE e.envioBoletoId = :id
            """)
    Optional<EnvioBoleto> findComCliente(@Param("id") UUID id);

    List<EnvioBoleto> findByLote_LoteIdOrderByCriadoEmAsc(UUID loteId);

    Optional<EnvioBoleto> findByEnvioBoletoIdAndLote_LoteId(UUID envioBoletoId, UUID loteId);

    boolean existsByHashArquivoAndCliente_ClienteIdAndStatus(
            String hashArquivo, UUID clienteId, StatusEnvioBoleto status);

    boolean existsByHashArquivoAndCliente_ClienteIdAndStatusAndEnvioBoletoIdNot(
            String hashArquivo, UUID clienteId, StatusEnvioBoleto status, UUID envioBoletoId);
}
