package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LivroCaixaDashboardServiceTest {

    @Mock LivroCaixaMovimentacaoRepository movimentacaoRepository;
    @Mock StaffAccessService staffAccessService;

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC);
    private LivroCaixaDashboardService service;

    @BeforeEach
    void setUp() {
        service = new LivroCaixaDashboardService(movimentacaoRepository, staffAccessService, clock);
    }

    @Test
    void dashboardConverteCentavosParaReais() {
        UUID userId = UUID.randomUUID();
        when(movimentacaoRepository.somarPorTipoEStatus(eq(LivroCaixaTipoMovimentacao.ENTRADA), any()))
                .thenReturn(new BigDecimal("10000"), BigDecimal.ZERO);
        when(movimentacaoRepository.somarPorTipoEStatus(eq(LivroCaixaTipoMovimentacao.SAIDA), any()))
                .thenReturn(new BigDecimal("4000"), BigDecimal.ZERO);
        when(movimentacaoRepository.somarNoPeriodoPorDataEfetiva(any(), any(), any(), any()))
                .thenReturn(new BigDecimal("10000"), new BigDecimal("4000"));

        var dto = service.dashboard(userId);

        assertThat(dto.getSaldoRealizado()).isEqualByComparingTo("60.00");
        assertThat(dto.getSaidasMes()).isEqualByComparingTo("40.00");
        assertThat(dto.getResultadoMes()).isEqualByComparingTo("60.00");
    }

    @Test
    void analiseAgrupaPorMesECategoria() {
        UUID userId = UUID.randomUUID();
        LivroCaixaMovimentacao entrada = LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .status(LivroCaixaStatusMovimentacao.RECEBIDO)
                .valorCentavos(new BigDecimal("5000"))
                .dataPagamento(LocalDate.of(2026, 8, 10))
                .build();
        LivroCaixaMovimentacao saida = LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                .status(LivroCaixaStatusMovimentacao.PAGO)
                .valorCentavos(new BigDecimal("2000"))
                .dataPagamento(LocalDate.of(2026, 8, 12))
                .build();
        when(movimentacaoRepository.listarRealizadasNoPeriodo(any(), any(), any()))
                .thenReturn(List.of(entrada, saida));
        when(movimentacaoRepository.somarSaidasPorCategoria(any(), any(), any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{"Aluguel", new BigDecimal("2000")}));

        var analise = service.analise(userId, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(analise.getEntradasSaidasMensais()).hasSize(1);
        assertThat(analise.getEntradasSaidasMensais().getFirst().getPeriodo()).isEqualTo("2026-08");
        assertThat(analise.getDespesasPorCategoria()).hasSize(1);
        assertThat(analise.getDespesasPorCategoria().getFirst().getPercentual()).isEqualByComparingTo("100.00");
        assertThat(analise.getFluxoCaixa()).hasSize(1);
    }
}
