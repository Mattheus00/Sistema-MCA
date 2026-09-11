package com.pucminas.sgi.listener;

import com.pucminas.sgi.event.PagamentoRegistradoEvent;
import com.pucminas.sgi.service.LivroCaixaIntegracaoService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Component
@Slf4j
@RequiredArgsConstructor
public class LivroCaixaPagamentoListener {

    private final LivroCaixaIntegracaoService integracaoService;


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
