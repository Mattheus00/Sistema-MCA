package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.*;
import com.pucminas.sgi.event.PagamentoRegistradoEvent;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.ContaFinanceiraRepository;
import com.pucminas.sgi.repository.LivroCaixaCategoriaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LivroCaixaIntegracaoService {

    private static final Logger log = LoggerFactory.getLogger(LivroCaixaIntegracaoService.class);
    private static final String CATEGORIA_HONORARIOS = "Honorários contábeis";

    private final LivroCaixaMovimentacaoService movimentacaoService;
    private final LivroCaixaCategoriaRepository categoriaRepository;
    private final ClienteRepository clienteRepository;
    private final ContaFinanceiraRepository contaFinanceiraRepository;

    public LivroCaixaIntegracaoService(LivroCaixaMovimentacaoService movimentacaoService,
                                       LivroCaixaCategoriaRepository categoriaRepository,
                                       ClienteRepository clienteRepository,
                                       ContaFinanceiraRepository contaFinanceiraRepository) {
        this.movimentacaoService = movimentacaoService;
        this.categoriaRepository = categoriaRepository;
        this.clienteRepository = clienteRepository;
        this.contaFinanceiraRepository = contaFinanceiraRepository;
    }

    @Transactional
    public void registrarEntradaPorPagamento(PagamentoRegistradoEvent event) {
        var categoria = categoriaRepository.findByNomeIgnoreCaseAndTipo(
                        CATEGORIA_HONORARIOS, LivroCaixaTipoMovimentacao.ENTRADA)
                .orElseGet(() -> categoriaRepository.findByTipoAndAtivoTrueOrderByNomeAsc(
                                LivroCaixaTipoMovimentacao.ENTRADA).stream().findFirst()
                        .orElse(null));
        if (categoria == null) {
            log.warn("Livro Caixa: nenhuma categoria de entrada disponível para pagamento {}", event.pagamentoId());
            return;
        }

        Cliente cliente = clienteRepository.findById(event.clienteId()).orElse(null);
        String nomeCliente = cliente != null ? cliente.getNome() : event.nomeCliente();
        var contaPadrao = contaFinanceiraRepository.findByAtivoTrueOrderByNomeAsc().stream().findFirst().orElse(null);

        LivroCaixaMovimentacao mov = LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .descricao("Recebimento - Cliente " + nomeCliente)
                .valorCentavos(event.valorCentavos())
                .categoria(categoria)
                .cliente(cliente)
                .dataMovimentacao(event.dataPagamento())
                .dataPagamento(event.dataPagamento())
                .status(LivroCaixaStatusMovimentacao.RECEBIDO)
                .formaPagamento(FormaPagamentoLivroCaixa.fromMetodoPagamento(event.metodoPagamento()))
                .conta(contaPadrao)
                .origem(LivroCaixaOrigemMovimentacao.INADIMPLENCIA)
                .origemId(event.pagamentoId())
                .criadoPor(AuditoriaService.USUARIO_SISTEMA)
                .atualizadoPor(AuditoriaService.USUARIO_SISTEMA)
                .build();

        movimentacaoService.criarAutomaticaInadimplencia(mov);
        log.info("Livro Caixa: entrada automática criada para pagamento {}", event.pagamentoId());
    }
}
