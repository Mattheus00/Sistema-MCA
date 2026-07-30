package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.ConfiguracaoCobranca;
import com.pucminas.sgi.enums.StatusCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConfiguracaoCobrancaRepository extends JpaRepository<ConfiguracaoCobranca, UUID> {

    Optional<ConfiguracaoCobranca> findByCliente_ClienteId(UUID clienteId);

    @Query("""
            SELECT cfg FROM ConfiguracaoCobranca cfg
            JOIN FETCH cfg.cliente c
            WHERE c.statusCliente = :status
              AND cfg.cobrancaRecorrenteAtiva = true
            """)
    List<ConfiguracaoCobranca> findAtivasParaClientesComStatus(@Param("status") StatusCliente status);

    @Query("""
            SELECT cfg FROM ConfiguracaoCobranca cfg
            JOIN FETCH cfg.cliente c
            WHERE c.statusCliente = :status
              AND cfg.taxaBalancoAtiva = true
            """)
    List<ConfiguracaoCobranca> findTaxaBalancoAtivasParaClientesComStatus(@Param("status") StatusCliente status);
}
