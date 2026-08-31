package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaAnexo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LivroCaixaAnexoRepository extends JpaRepository<LivroCaixaAnexo, UUID> {

    List<LivroCaixaAnexo> findByMovimentacaoIdOrderByCriadoEmDesc(UUID movimentacaoId);
}
