package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.LivroCaixaMovimentacaoResponseDTO;
import com.pucminas.sgi.dto.response.LivroCaixaRelatorioDTO;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.mapper.LivroCaixaMovimentacaoMapper;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoSpecs;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LivroCaixaRelatorioService {

    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final StaffAccessService staffAccessService;
    private final LivroCaixaMovimentacaoMapper movimentacaoMapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public LivroCaixaRelatorioDTO relatorio(UUID usuarioId,
                                            LocalDate dataInicio,
                                            LocalDate dataFim,
                                            LivroCaixaTipoMovimentacao tipo,
                                            LivroCaixaStatusMovimentacao status,
                                            UUID categoriaId,
                                            UUID contaId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate inicio = dataInicio != null ? dataInicio : YearMonth.now(clock).atDay(1);
        LocalDate fim = dataFim != null ? dataFim : LocalDate.now(clock);

        Page<LivroCaixaMovimentacao> page = movimentacaoRepository.findAll(
                LivroCaixaMovimentacaoSpecs.filtrar(
                        tipo, status, categoriaId, contaId, null, null,
                        inicio, fim, null, null, null),
                Pageable.unpaged());

        BigDecimal entradas = BigDecimal.ZERO;
        BigDecimal saidas = BigDecimal.ZERO;
        List<LivroCaixaMovimentacaoResponseDTO> itens = new ArrayList<>();
        for (LivroCaixaMovimentacao mov : page.getContent()) {
            if (LivroCaixaSupport.isRealizado(mov)) {
                if (mov.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA) {
                    entradas = entradas.add(mov.getValorCentavos());
                } else {
                    saidas = saidas.add(mov.getValorCentavos());
                }
            }
            itens.add(movimentacaoMapper.toDto(mov));
        }

        BigDecimal saldoFinal = entradas.subtract(saidas);
        return LivroCaixaRelatorioDTO.builder()
                .periodoDescricao(inicio + " a " + fim)
                .saldoInicial(BigDecimal.ZERO)
                .totalEntradas(LivroCaixaSupport.centavosParaReais(entradas))
                .totalSaidas(LivroCaixaSupport.centavosParaReais(saidas))
                .saldoFinal(LivroCaixaSupport.centavosParaReais(saldoFinal))
                .movimentacoes(itens)
                .build();
    }
}
