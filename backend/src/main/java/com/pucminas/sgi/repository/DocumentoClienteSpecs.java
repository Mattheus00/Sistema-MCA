package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class DocumentoClienteSpecs {

    private DocumentoClienteSpecs() {
    }

    public static Specification<DocumentoCliente> filtrar(UUID clienteId,
                                                        StatusDocumentoCliente status,
                                                        TipoDocumentoCliente tipo) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (clienteId != null) {
                predicates.add(cb.equal(root.get("cliente").get("clienteId"), clienteId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (tipo != null) {
                predicates.add(cb.equal(root.get("tipo"), tipo));
            }
            if (query != null) {
                query.orderBy(cb.desc(root.get("enviadoEm")));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
