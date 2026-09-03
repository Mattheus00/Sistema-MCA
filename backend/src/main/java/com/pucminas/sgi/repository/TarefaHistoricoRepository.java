package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.TarefaHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TarefaHistoricoRepository extends JpaRepository<TarefaHistorico, UUID> {

    List<TarefaHistorico> findByTarefaIdOrderByCriadoEmDesc(UUID tarefaId);
}
