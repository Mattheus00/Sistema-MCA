package com.pucminas.sgi.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Publicado após registro de pagamento de inadimplência para gerar entrada no Livro Caixa.
 */
public record PagamentoRegistradoEvent(
        UUID pagamentoId,
        UUID dividaId,
        UUID clienteId,
        String nomeCliente,
        BigDecimal valorCentavos,
        LocalDate dataPagamento,
        String metodoPagamento
) {}
