package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface LoteEnvioBoletoRepository extends JpaRepository<LoteEnvioBoleto, UUID> {

    @Query("""
            SELECT DISTINCT l FROM LoteEnvioBoleto l
            LEFT JOIN l.itens i
            LEFT JOIN i.cliente c
            WHERE (:status IS NULL OR l.status = :status)
            AND (:usuarioId IS NULL OR l.usuarioResponsavel.usuarioId = :usuarioId)
            AND (:clienteId IS NULL OR c.clienteId = :clienteId)
            AND (:dataInicio IS NULL OR l.criadoEm >= :dataInicio)
            AND (:dataFim IS NULL OR l.criadoEm <= :dataFim)
            AND (:email IS NULL OR LOWER(i.emailDestinatario) LIKE LOWER(CONCAT('%', :email, '%')))
            AND (:nomeArquivo IS NULL OR LOWER(i.nomeArquivoOriginal) LIKE LOWER(CONCAT('%', :nomeArquivo, '%')))
            """)
    Page<LoteEnvioBoleto> buscarHistorico(
            @Param("status") StatusLoteEnvioBoleto status,
            @Param("usuarioId") UUID usuarioId,
            @Param("clienteId") UUID clienteId,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            @Param("email") String email,
            @Param("nomeArquivo") String nomeArquivo,
            Pageable pageable);
}
