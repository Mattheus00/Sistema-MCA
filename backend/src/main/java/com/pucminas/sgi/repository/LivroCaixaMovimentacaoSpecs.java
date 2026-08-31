package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class LivroCaixaMovimentacaoSpecs {

    private LivroCaixaMovimentacaoSpecs() {
    }

    public static Specification<LivroCaixaMovimentacao> filtrar(
            LivroCaixaTipoMovimentacao tipo,
            LivroCaixaStatusMovimentacao status,
            UUID categoriaId,
            UUID contaId,
            UUID clienteId,
            FormaPagamentoLivroCaixa formaPagamento,
            LocalDate dataInicio,
            LocalDate dataFim,
            BigDecimal valorMinCentavos,
            BigDecimal valorMaxCentavos,
            String busca) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (tipo != null) {
                predicates.add(cb.equal(root.get("tipo"), tipo));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoriaId != null) {
                predicates.add(cb.equal(root.get("categoria").get("id"), categoriaId));
            }
            if (contaId != null) {
                predicates.add(cb.equal(root.get("conta").get("id"), contaId));
            }
            if (clienteId != null) {
                predicates.add(cb.equal(root.get("cliente").get("clienteId"), clienteId));
            }
            if (formaPagamento != null) {
                predicates.add(cb.equal(root.get("formaPagamento"), formaPagamento));
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataMovimentacao"), dataInicio));
            }
            if (dataFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataMovimentacao"), dataFim));
            }
            if (valorMinCentavos != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("valorCentavos"), valorMinCentavos));
            }
            if (valorMaxCentavos != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("valorCentavos"), valorMaxCentavos));
            }
            if (busca != null && !busca.isBlank()) {
                String termo = "%" + busca.trim().toLowerCase(Locale.ROOT) + "%";
                var clienteJoin = root.join("cliente", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("descricao")), termo),
                        cb.like(cb.lower(cb.coalesce(root.get("observacao"), "")), termo),
                        cb.like(cb.lower(cb.coalesce(root.get("fornecedor"), "")), termo),
                        cb.like(cb.lower(cb.coalesce(clienteJoin.get("nome"), "")), termo)
                ));
            }
            if (query != null) {
                query.distinct(true);
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
