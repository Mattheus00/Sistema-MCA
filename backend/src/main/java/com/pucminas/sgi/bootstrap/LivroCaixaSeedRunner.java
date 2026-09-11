package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.entity.ContaFinanceira;
import com.pucminas.sgi.entity.LivroCaixaCategoria;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.enums.TipoContaFinanceira;
import com.pucminas.sgi.repository.ContaFinanceiraRepository;
import com.pucminas.sgi.repository.LivroCaixaCategoriaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Categorias e contas padrão do Livro Caixa (idempotente).
 */
@Component
@Profile("!test")
@Order(5)
@Slf4j
@RequiredArgsConstructor
public class LivroCaixaSeedRunner implements CommandLineRunner {

    private final LivroCaixaCategoriaRepository categoriaRepository;
    private final ContaFinanceiraRepository contaRepository;


    @Override
    @Transactional
    public void run(String... args) {
        seedCategoriasEntrada();
        seedCategoriasSaida();
        seedContas();
    }

    private void seedCategoriasEntrada() {
        List<String> nomes = List.of(
                "Honorários contábeis",
                "Serviços extras",
                "Consultoria",
                "Regularização",
                "Outros recebimentos"
        );
        for (String nome : nomes) {
            categoriaRepository.findByNomeIgnoreCaseAndTipo(nome, LivroCaixaTipoMovimentacao.ENTRADA)
                    .orElseGet(() -> categoriaRepository.save(LivroCaixaCategoria.builder()
                            .nome(nome)
                            .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                            .ativo(true)
                            .build()));
        }
    }

    private void seedCategoriasSaida() {
        List<String> nomes = List.of(
                "Aluguel",
                "Energia",
                "Água",
                "Internet",
                "Telefone",
                "Software",
                "Salários",
                "Impostos",
                "Material de escritório",
                "Serviços",
                "Marketing",
                "Manutenção",
                "Transporte",
                "Outros"
        );
        for (String nome : nomes) {
            categoriaRepository.findByNomeIgnoreCaseAndTipo(nome, LivroCaixaTipoMovimentacao.SAIDA)
                    .orElseGet(() -> categoriaRepository.save(LivroCaixaCategoria.builder()
                            .nome(nome)
                            .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                            .ativo(true)
                            .build()));
        }
    }

    private void seedContas() {
        seedConta("Caixa", TipoContaFinanceira.CAIXA);
        seedConta("Banco", TipoContaFinanceira.BANCO);
        seedConta("Conta corrente", TipoContaFinanceira.CONTA_CORRENTE);
        seedConta("PIX", TipoContaFinanceira.PIX);
        seedConta("Cartão", TipoContaFinanceira.CARTAO);
        log.info("Livro Caixa: categorias e contas padrão verificadas.");
    }

    private void seedConta(String nome, TipoContaFinanceira tipo) {
        contaRepository.findByNomeIgnoreCase(nome)
                .orElseGet(() -> contaRepository.save(ContaFinanceira.builder()
                        .nome(nome)
                        .tipo(tipo)
                        .saldoInicialCentavos(BigDecimal.ZERO)
                        .ativo(true)
                        .build()));
    }
}
