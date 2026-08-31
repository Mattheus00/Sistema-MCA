package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaOrigemMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LivroCaixaMovimentacaoRepository extends JpaRepository<LivroCaixaMovimentacao, UUID>,
        JpaSpecificationExecutor<LivroCaixaMovimentacao> {

    boolean existsByCategoriaId(UUID categoriaId);

    boolean existsByOrigemAndOrigemId(LivroCaixaOrigemMovimentacao origem, UUID origemId);

    Optional<LivroCaixaMovimentacao> findByOrigemAndOrigemId(LivroCaixaOrigemMovimentacao origem, UUID origemId);

    @Query("""
            SELECT m FROM LivroCaixaMovimentacao m
            LEFT JOIN FETCH m.categoria
            LEFT JOIN FETCH m.conta
            LEFT JOIN FETCH m.cliente
            WHERE m.id = :id
            """)
    Optional<LivroCaixaMovimentacao> findByIdDetalhado(@Param("id") UUID id);

    @Query("""
            SELECT COALESCE(SUM(m.valorCentavos), 0) FROM LivroCaixaMovimentacao m
            WHERE m.tipo = :tipo AND m.status IN :statuses
            """)
    BigDecimal somarPorTipoEStatus(
            @Param("tipo") LivroCaixaTipoMovimentacao tipo,
            @Param("statuses") List<LivroCaixaStatusMovimentacao> statuses);

    @Query("""
            SELECT COALESCE(SUM(m.valorCentavos), 0) FROM LivroCaixaMovimentacao m
            WHERE m.tipo = :tipo AND m.status IN :statuses
              AND m.dataPagamento BETWEEN :inicio AND :fim
            """)
    BigDecimal somarRealizadoNoPeriodo(
            @Param("tipo") LivroCaixaTipoMovimentacao tipo,
            @Param("statuses") List<LivroCaixaStatusMovimentacao> statuses,
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);

    @Query("""
            SELECT m FROM LivroCaixaMovimentacao m
            WHERE m.status IN :statuses
              AND m.dataPagamento BETWEEN :inicio AND :fim
            """)
    List<LivroCaixaMovimentacao> listarRealizadasNoPeriodo(
            @Param("statuses") List<LivroCaixaStatusMovimentacao> statuses,
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);

    @Query("""
            SELECT cat.nome, COALESCE(SUM(m.valorCentavos), 0)
            FROM LivroCaixaMovimentacao m
            JOIN m.categoria cat
            WHERE m.tipo = :tipoSaida
              AND m.status = :statusPago
              AND m.dataPagamento BETWEEN :inicio AND :fim
            GROUP BY cat.nome
            ORDER BY SUM(m.valorCentavos) DESC
            """)
    List<Object[]> somarSaidasPorCategoria(
            @Param("tipoSaida") LivroCaixaTipoMovimentacao tipoSaida,
            @Param("statusPago") LivroCaixaStatusMovimentacao statusPago,
            @Param("inicio") LocalDate inicio,
            @Param("fim") LocalDate fim);
}
