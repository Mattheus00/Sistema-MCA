package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LivroCaixaHistoricoRepository extends JpaRepository<LivroCaixaHistorico, UUID> {

    List<LivroCaixaHistorico> findByMovimentacaoIdOrderByCriadoEmDesc(UUID movimentacaoId);
}
