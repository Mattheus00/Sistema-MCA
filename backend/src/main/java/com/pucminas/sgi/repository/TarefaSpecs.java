package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class TarefaSpecs {

    private TarefaSpecs() {
    }

    public static Specification<Tarefa> filtrar(
            UUID responsavelId,
            StatusTarefa status,
            PrioridadeTarefa prioridade,
            String categoria,
            String busca,
            LocalDate dataInicio,
            LocalDate dataFim,
            Boolean apenasAtrasadas) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (responsavelId != null) {
                predicates.add(cb.equal(root.get("responsavel").get("usuarioId"), responsavelId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (prioridade != null) {
                predicates.add(cb.equal(root.get("prioridade"), prioridade));
            }
            if (categoria != null && !categoria.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("categoria")), categoria.trim().toLowerCase(Locale.ROOT)));
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataVencimento"), dataInicio));
            }
            if (dataFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataVencimento"), dataFim));
            }
            if (Boolean.TRUE.equals(apenasAtrasadas)) {
                predicates.add(cb.isNotNull(root.get("dataVencimento")));
                predicates.add(cb.lessThan(root.get("dataVencimento"), LocalDate.now()));
                predicates.add(cb.notEqual(root.get("status"), StatusTarefa.CONCLUIDO));
            }
            if (busca != null && !busca.isBlank()) {
                String termo = "%" + busca.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("titulo")), termo),
                        cb.like(cb.lower(cb.coalesce(root.get("descricao"), "")), termo)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
