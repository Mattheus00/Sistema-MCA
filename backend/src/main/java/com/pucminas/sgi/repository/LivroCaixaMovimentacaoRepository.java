package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaOrigemMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LivroCaixaMovimentacaoRepository extends JpaRepository<LivroCaixaMovimentacao, UUID> {

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
            SELECT m FROM LivroCaixaMovimentacao m
            LEFT JOIN m.categoria cat
            LEFT JOIN m.cliente cli
            WHERE (:tipo IS NULL OR m.tipo = :tipo)
              AND (:status IS NULL OR m.status = :status)
              AND (:categoriaId IS NULL OR cat.id = :categoriaId)
              AND (:contaId IS NULL OR m.conta.id = :contaId)
              AND (:clienteId IS NULL OR cli.clienteId = :clienteId)
              AND (:formaPagamento IS NULL OR m.formaPagamento = :formaPagamento)
              AND (:dataInicio IS NULL OR m.dataMovimentacao >= :dataInicio)
              AND (:dataFim IS NULL OR m.dataMovimentacao <= :dataFim)
              AND (:valorMinCentavos IS NULL OR m.valorCentavos >= :valorMinCentavos)
              AND (:valorMaxCentavos IS NULL OR m.valorCentavos <= :valorMaxCentavos)
              AND (:busca IS NULL OR LOWER(m.descricao) LIKE LOWER(CONCAT('%', :busca, '%'))
                   OR LOWER(COALESCE(m.observacao, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                   OR LOWER(COALESCE(m.fornecedor, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                   OR LOWER(COALESCE(cli.nome, '')) LIKE LOWER(CONCAT('%', :busca, '%')))
            """)
    Page<LivroCaixaMovimentacao> buscarComFiltros(
            @Param("tipo") LivroCaixaTipoMovimentacao tipo,
            @Param("status") LivroCaixaStatusMovimentacao status,
            @Param("categoriaId") UUID categoriaId,
            @Param("contaId") UUID contaId,
            @Param("clienteId") UUID clienteId,
            @Param("formaPagamento") FormaPagamentoLivroCaixa formaPagamento,
            @Param("dataInicio") LocalDate dataInicio,
            @Param("dataFim") LocalDate dataFim,
            @Param("valorMinCentavos") BigDecimal valorMinCentavos,
            @Param("valorMaxCentavos") BigDecimal valorMaxCentavos,
            @Param("busca") String busca,
            Pageable pageable);

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
