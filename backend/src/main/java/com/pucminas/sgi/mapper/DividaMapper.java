package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.dto.response.ItemServicoResponseDTO;
import com.pucminas.sgi.dto.response.PagamentoResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.repository.PagamentoRepository;
import com.pucminas.sgi.util.MoneyUtil;
import com.pucminas.sgi.util.MultaJurosUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DividaMapper {

    private final PagamentoRepository pagamentoRepository;
    private final Clock clock;

    public DividaResponseDTO toResponse(Divida d) {
        Cliente c = d.getCliente();
        List<ItemServicoResponseDTO> itensDto = d.getItensServicos().stream()
                .map(item -> ItemServicoResponseDTO.builder()
                        .servicoId(item.getServico().getServicoId())
                        .nomeServico(item.getServico().getNome())
                        .valor(MoneyUtil.centavosParaReais(item.getValor()))
                        .build())
                .collect(Collectors.toList());
        BigDecimal[] valorEJuros = computarValorEJurosEmTempoReal(d);
        BigDecimal vOrig = MoneyUtil.centavosParaReais(d.getValorOriginal());
        BigDecimal vDev = valorEJuros[0];
        BigDecimal juros = valorEJuros[1];
        List<PagamentoResponseDTO> pagamentosDto = pagamentoRepository.findByDivida_DividaIdOrderByDataPagamentoDesc(d.getDividaId())
                .stream()
                .map(this::pagamentoParaDto)
                .collect(Collectors.toList());
        return DividaResponseDTO.builder()
                .dividaId(d.getDividaId())
                .clienteId(c.getClienteId())
                .nomeCliente(c.getNome())
                .valorOriginal(vOrig)
                .valorDevedor(vDev)
                .juros(juros)
                .vencimento(d.getVencimento())
                .descricao(d.getDescricao())
                .tipoCobranca(d.getTipoCobranca())
                .competencia(d.getCompetencia())
                .geradaAutomaticamente(d.getGeradaAutomaticamente())
                .origemCobranca(d.getOrigemCobranca())
                .anoTaxaBalanco(d.getAnoTaxaBalanco())
                .statusDivida(d.getStatusDivida())
                .protocolo(d.getProtocolo())
                .criadoEm(d.getCriadoEm())
                .atualizadoEm(d.getAtualizadoEm())
                .itensServicos(itensDto)
                .pagamentos(pagamentosDto)
                .build();
    }

    public PagamentoResponseDTO pagamentoParaDto(Pagamento p) {
        return PagamentoResponseDTO.builder()
                .pagamentoId(p.getPagamentoId())
                .dividaId(p.getDivida().getDividaId())
                .protocoloDivida(p.getDivida().getProtocolo())
                .valorPago(MoneyUtil.centavosParaReais(p.getValorPago()))
                .dataPagamento(p.getDataPagamento())
                .metodoPagamento(p.getMetodoPagamento())
                .comprovante(p.getComprovante())
                .criadoEm(p.getCriadoEm())
                .build();
    }

    public BigDecimal[] computarValorEJurosEmTempoReal(Divida d) {
        LocalDate hoje = LocalDate.now(clock);
        boolean vencida = hoje.isAfter(d.getVencimento());
        boolean statusAberto = StatusDivida.emAberto().contains(d.getStatusDivida());
        if (!vencida || !statusAberto) {
            BigDecimal vOrig = MoneyUtil.centavosParaReais(d.getValorOriginal());
            BigDecimal vDev = MoneyUtil.centavosParaReais(d.getValorDevedor());
            BigDecimal juros = vDev.subtract(vOrig).max(BigDecimal.ZERO);
            return new BigDecimal[]{vDev, juros};
        }
        BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(d.getDividaId());
        if (totalPago == null) {
            totalPago = BigDecimal.ZERO;
        }
        BigDecimal saldoCentavos = calcularSaldoDevedorCentavos(d, totalPago, hoje);
        BigDecimal principalRestante = d.getValorOriginal().subtract(totalPago.min(d.getValorOriginal())).max(BigDecimal.ZERO);
        BigDecimal jurosCentavos = saldoCentavos.subtract(principalRestante).max(BigDecimal.ZERO);
        return new BigDecimal[]{
                MoneyUtil.centavosParaReais(saldoCentavos),
                MoneyUtil.centavosParaReais(jurosCentavos)
        };
    }

    public static BigDecimal calcularSaldoDevedorCentavos(Divida d, BigDecimal totalPago, LocalDate hoje) {
        BigDecimal pago = totalPago != null ? totalPago : BigDecimal.ZERO;
        BigDecimal bruto;
        if (hoje.isAfter(d.getVencimento()) && StatusDivida.emAberto().contains(d.getStatusDivida())) {
            bruto = MultaJurosUtil.valorTotalComMultaEJuros(d.getValorOriginal(), d.getVencimento(), hoje);
        } else {
            bruto = d.getValorOriginal();
        }
        BigDecimal saldo = bruto.subtract(pago);
        return saldo.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : saldo;
    }
}
