package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.HonorarioCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HonorarioClienteRepository extends JpaRepository<HonorarioCliente, UUID> {

    List<HonorarioCliente> findByCliente_ClienteIdOrderByDataInicioVigenciaDesc(UUID clienteId);

    @Query("""
            SELECT h FROM HonorarioCliente h
            WHERE h.cliente.clienteId = :clienteId
              AND h.ativo = true
              AND h.dataInicioVigencia <= :data
              AND (h.dataFimVigencia IS NULL OR h.dataFimVigencia >= :data)
            ORDER BY h.dataInicioVigencia DESC
            """)
    List<HonorarioCliente> findVigentesNaData(@Param("clienteId") UUID clienteId, @Param("data") LocalDate data);

    default Optional<HonorarioCliente> findVigenteNaData(UUID clienteId, LocalDate data) {
        return findVigentesNaData(clienteId, data).stream().findFirst();
    }

    @Query("""
            SELECT h FROM HonorarioCliente h
            WHERE h.cliente.clienteId = :clienteId
              AND h.ativo = true
              AND h.dataInicioVigencia >= :dataInicio
            ORDER BY h.dataInicioVigencia ASC
            """)
    List<HonorarioCliente> findFuturosApartirDe(@Param("clienteId") UUID clienteId, @Param("dataInicio") LocalDate dataInicio);

    @Query("""
            SELECT COUNT(h) FROM HonorarioCliente h
            WHERE h.cliente.clienteId = :clienteId
              AND h.ativo = true
              AND h.dataInicioVigencia <= :fim
              AND (h.dataFimVigencia IS NULL OR h.dataFimVigencia >= :inicio)
            """)
    long countSobreposicoes(@Param("clienteId") UUID clienteId,
                            @Param("inicio") LocalDate inicio,
                            @Param("fim") LocalDate fim);
}
