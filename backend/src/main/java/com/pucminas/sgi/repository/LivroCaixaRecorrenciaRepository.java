package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaRecorrencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LivroCaixaRecorrenciaRepository extends JpaRepository<LivroCaixaRecorrencia, UUID> {

    List<LivroCaixaRecorrencia> findByAtivoTrueAndProximaGeracaoLessThanEqualOrderByProximaGeracaoAsc(LocalDate data);
}
