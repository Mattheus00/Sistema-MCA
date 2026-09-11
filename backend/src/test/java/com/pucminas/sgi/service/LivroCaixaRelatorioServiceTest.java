package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.mapper.LivroCaixaMovimentacaoMapper;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LivroCaixaRelatorioServiceTest {

    @Mock LivroCaixaMovimentacaoRepository movimentacaoRepository;
    @Mock StaffAccessService staffAccessService;
    @Mock LivroCaixaMovimentacaoMapper movimentacaoMapper;

    private LivroCaixaRelatorioService service;

    @BeforeEach
    void setUp() {
        service = new LivroCaixaRelatorioService(
                movimentacaoRepository, staffAccessService, movimentacaoMapper,
                Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void relatorioSomaSomenteRealizados() {
        LivroCaixaMovimentacao entrada = LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .status(LivroCaixaStatusMovimentacao.RECEBIDO)
                .valorCentavos(new BigDecimal("15000"))
                .build();
        LivroCaixaMovimentacao previsto = LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                .status(LivroCaixaStatusMovimentacao.PREVISTO)
                .valorCentavos(new BigDecimal("99999"))
                .build();
        when(movimentacaoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entrada, previsto)));
        when(movimentacaoMapper.toDto(any())).thenReturn(null);

        var rel = service.relatorio(UUID.randomUUID(), LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30),
                null, null, null, null);

        assertThat(rel.getTotalEntradas()).isEqualByComparingTo("150.00");
        assertThat(rel.getTotalSaidas()).isEqualByComparingTo("0.00");
        assertThat(rel.getSaldoFinal()).isEqualByComparingTo("150.00");
        assertThat(rel.getPeriodoDescricao()).contains("2026-09-01");
    }
}
