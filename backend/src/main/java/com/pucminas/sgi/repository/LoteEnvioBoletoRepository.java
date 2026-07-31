package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
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
            WHERE (:filtrarStatus = false OR l.status = :status)
            AND (:filtrarUsuario = false OR l.usuarioResponsavel.usuarioId = :usuarioId)
            AND (:filtrarCliente = false OR c.clienteId = :clienteId)
            AND (:filtrarDataInicio = false OR l.criadoEm >= :dataInicio)
            AND (:filtrarDataFim = false OR l.criadoEm <= :dataFim)
            AND (:filtrarEmail = false OR LOWER(i.emailDestinatario) LIKE :emailLike)
            AND (:filtrarNomeArquivo = false OR LOWER(i.nomeArquivoOriginal) LIKE :nomeArquivoLike)
            """)
    @EntityGraph(attributePaths = "usuarioResponsavel")
    Page<LoteEnvioBoleto> buscarHistorico(
            @Param("status") StatusLoteEnvioBoleto status,
            @Param("filtrarStatus") boolean filtrarStatus,
            @Param("usuarioId") UUID usuarioId,
            @Param("filtrarUsuario") boolean filtrarUsuario,
            @Param("clienteId") UUID clienteId,
            @Param("filtrarCliente") boolean filtrarCliente,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("filtrarDataInicio") boolean filtrarDataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            @Param("filtrarDataFim") boolean filtrarDataFim,
            @Param("emailLike") String emailLike,
            @Param("filtrarEmail") boolean filtrarEmail,
            @Param("nomeArquivoLike") String nomeArquivoLike,
            @Param("filtrarNomeArquivo") boolean filtrarNomeArquivo,
            Pageable pageable);
}
