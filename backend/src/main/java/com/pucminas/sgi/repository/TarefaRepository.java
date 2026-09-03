package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TarefaRepository extends JpaRepository<Tarefa, UUID>, JpaSpecificationExecutor<Tarefa> {

    @Query("""
            SELECT t FROM Tarefa t
            LEFT JOIN FETCH t.responsavel
            LEFT JOIN FETCH t.criadoPor
            WHERE t.id = :id
            """)
    Optional<Tarefa> findByIdDetalhado(@Param("id") UUID id);

    @Query("SELECT MAX(t.ordemKanban) FROM Tarefa t WHERE t.status = :status")
    Integer maxOrdemKanbanPorStatus(@Param("status") StatusTarefa status);

    @Query("""
            SELECT MAX(t.ordemKanban) FROM Tarefa t
            WHERE t.status = :status AND t.responsavel.usuarioId = :responsavelId
            """)
    Integer maxOrdemKanbanPorStatusEResponsavel(
            @Param("status") StatusTarefa status,
            @Param("responsavelId") UUID responsavelId);

    long countByResponsavel_UsuarioIdAndStatusIn(UUID responsavelId, List<StatusTarefa> statuses);

    long countByStatusIn(List<StatusTarefa> statuses);

    long countByResponsavel_UsuarioIdAndStatusInAndDataVencimentoBefore(
            UUID responsavelId, List<StatusTarefa> statuses, LocalDate data);

    long countByStatusInAndDataVencimentoBefore(List<StatusTarefa> statuses, LocalDate data);

    long countByResponsavel_UsuarioIdAndStatusAndConcluidoEmBetween(
            UUID responsavelId, StatusTarefa status, LocalDateTime inicio, LocalDateTime fim);

    long countByStatusAndConcluidoEmBetween(StatusTarefa status, LocalDateTime inicio, LocalDateTime fim);

    List<Tarefa> findByResponsavel_UsuarioIdAndStatusOrderByOrdemKanbanAsc(UUID responsavelId, StatusTarefa status);

    List<Tarefa> findByStatusOrderByOrdemKanbanAsc(StatusTarefa status);
}
