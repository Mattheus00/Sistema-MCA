package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaCategoria;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LivroCaixaCategoriaRepository extends JpaRepository<LivroCaixaCategoria, UUID> {

    List<LivroCaixaCategoria> findByTipoAndAtivoTrueOrderByNomeAsc(LivroCaixaTipoMovimentacao tipo);

    List<LivroCaixaCategoria> findByAtivoTrueOrderByTipoAscNomeAsc();

    Optional<LivroCaixaCategoria> findByNomeIgnoreCaseAndTipo(String nome, LivroCaixaTipoMovimentacao tipo);
}
