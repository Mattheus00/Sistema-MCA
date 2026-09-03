package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.TarefaChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TarefaChecklistRepository extends JpaRepository<TarefaChecklistItem, UUID> {

    List<TarefaChecklistItem> findByTarefaIdOrderByOrdemAsc(UUID tarefaId);

    long countByTarefaId(UUID tarefaId);

    long countByTarefaIdAndConcluidoTrue(UUID tarefaId);
}
