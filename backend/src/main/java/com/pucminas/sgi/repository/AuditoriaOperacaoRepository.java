package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.AuditoriaOperacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditoriaOperacaoRepository extends JpaRepository<AuditoriaOperacao, UUID> {
}
