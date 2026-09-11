package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class ClienteSpecs {

    private ClienteSpecs() {
    }

    public static Specification<Cliente> buscar(String busca, StatusCliente status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("statusCliente"), status));
            } else {
                predicates.add(cb.notEqual(root.get("statusCliente"), StatusCliente.INATIVO));
            }
            if (busca != null && !busca.isBlank()) {
                String termo = busca.trim().toLowerCase(Locale.ROOT);
                String termoLike = "%" + termo + "%";
                String digitos = termo.replaceAll("\\D", "");
                Predicate nome = cb.like(cb.lower(root.get("nome")), termoLike);
                Predicate codigo = cb.like(cb.lower(root.get("codigo")), termoLike);
                if (!digitos.isEmpty()) {
                    predicates.add(cb.or(nome, codigo, cb.like(root.get("cpfCnpj"), "%" + digitos + "%")));
                } else {
                    predicates.add(cb.or(nome, codigo));
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
