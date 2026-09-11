package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.LivroCaixaAnaliseDTO;
import com.pucminas.sgi.dto.response.LivroCaixaDashboardDTO;
import com.pucminas.sgi.dto.response.LivroCaixaFluxoCaixaItemDTO;
import com.pucminas.sgi.dto.response.LivroCaixaGraficoCategoriaItemDTO;
import com.pucminas.sgi.dto.response.LivroCaixaGraficoMensalItemDTO;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LivroCaixaDashboardService {

    private static final List<LivroCaixaStatusMovimentacao> STATUS_ENTRADA_REALIZADO =
            List.of(LivroCaixaStatusMovimentacao.RECEBIDO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_SAIDA_REALIZADO =
            List.of(LivroCaixaStatusMovimentacao.PAGO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_ENTRADA_MES =
            List.of(LivroCaixaStatusMovimentacao.RECEBIDO, LivroCaixaStatusMovimentacao.PREVISTO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_SAIDA_MES =
            List.of(LivroCaixaStatusMovimentacao.PAGO, LivroCaixaStatusMovimentacao.PREVISTO);

    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final StaffAccessService staffAccessService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public LivroCaixaDashboardDTO dashboard(UUID usuarioId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate hoje = LocalDate.now(clock);
        YearMonth mesAtual = YearMonth.from(hoje);
        LocalDate inicioMes = mesAtual.atDay(1);
        LocalDate fimMes = mesAtual.atEndOfMonth();

        BigDecimal entradasRealizadas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.ENTRADA, STATUS_ENTRADA_REALIZADO);
        BigDecimal saidasRealizadas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.SAIDA, STATUS_SAIDA_REALIZADO);
        BigDecimal entradasPrevistas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.ENTRADA, List.of(LivroCaixaStatusMovimentacao.PREVISTO));
        BigDecimal saidasPrevistas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.SAIDA, List.of(LivroCaixaStatusMovimentacao.PREVISTO));

        BigDecimal saldoRealizadoCentavos = entradasRealizadas.subtract(saidasRealizadas);
        BigDecimal saldoPrevistoCentavos = saldoRealizadoCentavos.add(entradasPrevistas).subtract(saidasPrevistas);

        BigDecimal entradasMesCentavos = movimentacaoRepository.somarNoPeriodoPorDataEfetiva(
                LivroCaixaTipoMovimentacao.ENTRADA, STATUS_ENTRADA_MES, inicioMes, fimMes);
        BigDecimal saidasMesCentavos = movimentacaoRepository.somarNoPeriodoPorDataEfetiva(
                LivroCaixaTipoMovimentacao.SAIDA, STATUS_SAIDA_MES, inicioMes, fimMes);

        return LivroCaixaDashboardDTO.builder()
                .saldoRealizado(LivroCaixaSupport.centavosParaReais(saldoRealizadoCentavos))
                .saldoPrevisto(LivroCaixaSupport.centavosParaReais(saldoPrevistoCentavos))
                .entradasMes(LivroCaixaSupport.centavosParaReais(entradasMesCentavos))
                .saidasMes(LivroCaixaSupport.centavosParaReais(saidasMesCentavos))
                .resultadoMes(LivroCaixaSupport.centavosParaReais(entradasMesCentavos.subtract(saidasMesCentavos)))
                .build();
    }

    @Transactional(readOnly = true)
    public LivroCaixaAnaliseDTO analise(UUID usuarioId, LocalDate dataInicio, LocalDate dataFim) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate inicio = dataInicio != null ? dataInicio : LocalDate.now(clock).minusMonths(5).withDayOfMonth(1);
        LocalDate fim = dataFim != null ? dataFim : LocalDate.now(clock);

        List<LivroCaixaMovimentacao> realizadas = movimentacaoRepository.listarRealizadasNoPeriodo(
                List.of(LivroCaixaStatusMovimentacao.RECEBIDO, LivroCaixaStatusMovimentacao.PAGO),
                inicio, fim);

        Map<YearMonth, BigDecimal[]> porMes = new TreeMap<>();
        for (LivroCaixaMovimentacao mov : realizadas) {
            if (mov.getDataPagamento() == null) {
                continue;
            }
            YearMonth ym = YearMonth.from(mov.getDataPagamento());
            BigDecimal[] acc = porMes.computeIfAbsent(ym, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            if (mov.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA) {
                acc[0] = acc[0].add(mov.getValorCentavos());
            } else {
                acc[1] = acc[1].add(mov.getValorCentavos());
            }
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        List<LivroCaixaGraficoMensalItemDTO> mensal = porMes.entrySet().stream()
                .map(e -> {
                    BigDecimal ent = e.getValue()[0];
                    BigDecimal sai = e.getValue()[1];
                    return LivroCaixaGraficoMensalItemDTO.builder()
                            .periodo(e.getKey().format(fmt))
                            .entradas(LivroCaixaSupport.centavosParaReais(ent))
                            .saidas(LivroCaixaSupport.centavosParaReais(sai))
                            .resultado(LivroCaixaSupport.centavosParaReais(ent.subtract(sai)))
                            .build();
                })
                .collect(Collectors.toList());

        List<Object[]> categorias = movimentacaoRepository.somarSaidasPorCategoria(
                LivroCaixaTipoMovimentacao.SAIDA,
                LivroCaixaStatusMovimentacao.PAGO,
                inicio, fim);
        BigDecimal totalSaidas = categorias.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LivroCaixaGraficoCategoriaItemDTO> porCategoria = categorias.stream()
                .map(row -> {
                    BigDecimal valor = (BigDecimal) row[1];
                    BigDecimal pct = totalSaidas.compareTo(BigDecimal.ZERO) == 0
                            ? BigDecimal.ZERO
                            : valor.multiply(BigDecimal.valueOf(100))
                            .divide(totalSaidas, 2, RoundingMode.HALF_UP);
                    return LivroCaixaGraficoCategoriaItemDTO.builder()
                            .categoria((String) row[0])
                            .valor(LivroCaixaSupport.centavosParaReais(valor))
                            .percentual(pct)
                            .build();
                })
                .collect(Collectors.toList());

        BigDecimal saldoAcumulado = BigDecimal.ZERO;
        List<LivroCaixaFluxoCaixaItemDTO> fluxo = new ArrayList<>();
        for (Map.Entry<YearMonth, BigDecimal[]> entry : porMes.entrySet()) {
            BigDecimal ent = entry.getValue()[0];
            BigDecimal sai = entry.getValue()[1];
            BigDecimal saldoInicial = saldoAcumulado;
            saldoAcumulado = saldoAcumulado.add(ent).subtract(sai);
            fluxo.add(LivroCaixaFluxoCaixaItemDTO.builder()
                    .periodo(entry.getKey().format(fmt))
                    .saldoInicial(LivroCaixaSupport.centavosParaReais(saldoInicial))
                    .entradas(LivroCaixaSupport.centavosParaReais(ent))
                    .saidas(LivroCaixaSupport.centavosParaReais(sai))
                    .saldoFinal(LivroCaixaSupport.centavosParaReais(saldoAcumulado))
                    .build());
        }

        return LivroCaixaAnaliseDTO.builder()
                .entradasSaidasMensais(mensal)
                .despesasPorCategoria(porCategoria)
                .fluxoCaixa(fluxo)
                .build();
    }
}
