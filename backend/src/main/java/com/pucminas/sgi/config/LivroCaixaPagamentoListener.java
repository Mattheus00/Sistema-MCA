package com.pucminas.sgi.config;

import com.pucminas.sgi.event.PagamentoRegistradoEvent;
import com.pucminas.sgi.service.LivroCaixaIntegracaoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class LivroCaixaPagamentoListener {

    private static final Logger log = LoggerFactory.getLogger(LivroCaixaPagamentoListener.class);

    private final LivroCaixaIntegracaoService integracaoService;

    public LivroCaixaPagamentoListener(LivroCaixaIntegracaoService integracaoService) {
        this.integracaoService = integracaoService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPagamentoRegistrado(PagamentoRegistradoEvent event) {
        try {
            integracaoService.registrarEntradaPorPagamento(event);
        } catch (Exception e) {
            log.warn("Falha ao gerar entrada no Livro Caixa para pagamento {}: {}",
                    event.pagamentoId(), e.getMessage());
        }
    }
}
