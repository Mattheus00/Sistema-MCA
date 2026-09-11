package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.enums.TipoCobranca;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Divida.
 */
@Repository
public interface DividaRepository extends JpaRepository<Divida, UUID> {

    List<Divida> findByCliente_ClienteIdAndStatusDivida(UUID clienteId, StatusDivida status);

    List<Divida> findByVencimentoBetween(LocalDate inicio, LocalDate fim);

    Page<Divida> findByVencimentoBetween(LocalDate inicio, LocalDate fim, Pageable pageable);

    @EntityGraph(attributePaths = "cliente")
    List<Divida> findByStatusDividaIn(List<StatusDivida> status);

    @EntityGraph(attributePaths = "cliente")
    Page<Divida> findByStatusDividaIn(List<StatusDivida> status, Pageable pageable);

    List<Divida> findByCliente_ClienteIdOrderByVencimentoAsc(UUID clienteId);

    Page<Divida> findByCliente_ClienteId(UUID clienteId, Pageable pageable);

    Optional<Divida> findByProtocolo(String protocolo);

    boolean existsByCliente_ClienteIdAndTipoCobrancaAndCompetencia(UUID clienteId, TipoCobranca tipoCobranca, String competencia);

    @Query("SELECT d FROM Divida d JOIN FETCH d.cliente WHERE d.dividaId = :id")
    Optional<Divida> findByIdWithCliente(@Param("id") UUID id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Divida d SET d.statusDivida = :status WHERE d.dividaId = :id")
    int setStatusDivida(@Param("id") UUID id, @Param("status") StatusDivida status);

    @Query("SELECT d.cliente.clienteId FROM Divida d WHERE d.dividaId = :id")
    Optional<UUID> findClienteIdByDividaId(@Param("id") UUID id);

    @Query("SELECT COALESCE(SUM(d.valorDevedor), 0) FROM Divida d WHERE d.cliente.clienteId = :clienteId AND d.statusDivida IN :statusList")
    BigDecimal sumValorDevedorByClienteId(@Param("clienteId") UUID clienteId, @Param("statusList") List<StatusDivida> statusList);

    @Query("""
            SELECT d FROM Divida d JOIN FETCH d.cliente
            WHERE d.statusDivida IN :status
              AND d.vencimento >= :inicio AND d.vencimento <= :fim
            """)
    List<Divida> findByStatusDividaInAndVencimentoBetween(
            @Param("status") List<StatusDivida> status,
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);

    @Query("""
            SELECT COALESCE(SUM(d.valorDevedor), 0) FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
            """)
    BigDecimal sumValorDevedorByStatusDividaNotIn(@Param("excluidos") List<StatusDivida> excluidos);

    @Query("""
            SELECT COALESCE(SUM(d.valorDevedor), 0) FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
              AND d.vencimento >= :limite
            """)
    BigDecimal sumValorDevedorByStatusDividaNotInAndVencimentoGreaterThanEqual(
            @Param("excluidos") List<StatusDivida> excluidos,
            @Param("limite") LocalDate limite);

    @Query("""
            SELECT COUNT(d) FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
            """)
    long countByStatusDividaNotIn(@Param("excluidos") List<StatusDivida> excluidos);

    @Query("""
            SELECT COUNT(d) FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
              AND d.vencimento >= :limite
            """)
    long countByStatusDividaNotInAndVencimentoGreaterThanEqual(
            @Param("excluidos") List<StatusDivida> excluidos,
            @Param("limite") LocalDate limite);

    @Query("""
            SELECT d FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
            """)
    List<Divida> findByStatusDividaNotIn(@Param("excluidos") List<StatusDivida> excluidos);

    @Query("""
            SELECT d FROM Divida d
            WHERE d.statusDivida NOT IN :excluidos
              AND d.vencimento >= :limite
            """)
    List<Divida> findByStatusDividaNotInAndVencimentoGreaterThanEqual(
            @Param("excluidos") List<StatusDivida> excluidos,
            @Param("limite") LocalDate limite);

    long countByStatusDivida(StatusDivida status);
}
