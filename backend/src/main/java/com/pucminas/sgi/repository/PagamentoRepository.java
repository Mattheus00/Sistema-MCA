package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Pagamento.
 */
@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, UUID> {

    List<Pagamento> findByDivida_DividaIdOrderByDataPagamentoDesc(UUID dividaId);

    List<Pagamento> findByDataPagamentoBetween(LocalDate inicio, LocalDate fim);

    @Query("SELECT COALESCE(SUM(p.valorPago), 0) FROM Pagamento p WHERE p.divida.dividaId = :dividaId")
    java.math.BigDecimal sumValorPagoByDividaId(@Param("dividaId") UUID dividaId);

    @Query("SELECT COALESCE(SUM(p.valorPago), 0) FROM Pagamento p")
    java.math.BigDecimal sumValorPago();

    @Query("SELECT COALESCE(SUM(p.valorPago), 0) FROM Pagamento p WHERE p.dataPagamento BETWEEN :inicio AND :fim")
    java.math.BigDecimal sumValorPagoBetween(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

    long countByDataPagamentoBetween(LocalDate inicio, LocalDate fim);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "divida")
    List<Pagamento> findTop50ByDivida_Cliente_ClienteIdOrderByDataPagamentoDesc(UUID clienteId);
}
