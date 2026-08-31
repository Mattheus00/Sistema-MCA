package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.ContaFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContaFinanceiraRepository extends JpaRepository<ContaFinanceira, UUID> {

    List<ContaFinanceira> findByAtivoTrueOrderByNomeAsc();

    Optional<ContaFinanceira> findByNomeIgnoreCase(String nome);
}
