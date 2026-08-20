package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.PortalDividaDTO;
import com.pucminas.sgi.dto.response.PortalExtratoDTO;
import com.pucminas.sgi.dto.response.PortalMeResponseDTO;
import com.pucminas.sgi.dto.response.PortalPagamentoDTO;
import com.pucminas.sgi.dto.response.PortalResumoDTO;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.portal.PortalAccessGuard;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import com.pucminas.sgi.util.MoneyUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PortalClienteService {

    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final PagamentoRepository pagamentoRepository;
    private final DividaService dividaService;
    private final PortalAuthService portalAuthService;
    private final PortalAccessGuard portalAccessGuard;
    private final ClienteService clienteService;

    public PortalClienteService(ClienteRepository clienteRepository,
                                DividaRepository dividaRepository,
                                PagamentoRepository pagamentoRepository,
                                DividaService dividaService,
                                PortalAuthService portalAuthService,
                                PortalAccessGuard portalAccessGuard,
                                ClienteService clienteService) {
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.dividaService = dividaService;
        this.portalAuthService = portalAuthService;
        this.portalAccessGuard = portalAccessGuard;
        this.clienteService = clienteService;
    }

    @Transactional(readOnly = true)
    public PortalMeResponseDTO me(UUID clienteId) {
        return portalAuthService.me(clienteId);
    }

    @Transactional(readOnly = true)
    public PortalResumoDTO resumo(UUID clienteId) {
        List<Divida> dividasAbertas = dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .filter(d -> StatusDivida.emAberto().contains(d.getStatusDivida()))
                .filter(d -> d.getValorDevedor().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
        LocalDate hoje = LocalDate.now();
        int vencidas = (int) dividasAbertas.stream()
                .filter(d -> d.getVencimento().isBefore(hoje))
                .count();
        return PortalResumoDTO.builder()
                .saldoDevedorTotal(MoneyUtil.centavosParaReais(
                        clienteService.calcularSaldoDevedor(clienteId)))
                .dividasAbertas(dividasAbertas.size())
                .dividasVencidas(vencidas)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PortalDividaDTO> listarDividas(UUID clienteId, String statusFiltro) {
        List<Divida> dividas = dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId);
        return dividas.stream()
                .filter(d -> d.getStatusDivida() != StatusDivida.CANCELADA)
                .filter(d -> filtrarPorStatus(d, statusFiltro))
                .map(this::toDividaResumo)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PortalDividaDTO detalharDivida(UUID clienteId, UUID dividaId) {
        Divida divida = portalAccessGuard.carregarDividaDoCliente(dividaId, clienteId);
        List<PortalPagamentoDTO> pagamentos = pagamentoRepository
                .findByDivida_DividaIdOrderByDataPagamentoDesc(dividaId).stream()
                .map(this::toPagamentoDto)
                .collect(Collectors.toList());
        PortalDividaDTO dto = toDividaResumo(divida);
        dto.setPagamentos(pagamentos);
        return dto;
    }

    @Transactional(readOnly = true)
    public PortalExtratoDTO extrato(UUID clienteId) {
        PortalMeResponseDTO cliente = portalAuthService.me(clienteId);
        List<PortalDividaDTO> abertas = listarDividas(clienteId, "abertas");
        List<PortalPagamentoDTO> historico = new ArrayList<>();
        for (Divida d : dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId)) {
            for (Pagamento p : pagamentoRepository.findByDivida_DividaIdOrderByDataPagamentoDesc(d.getDividaId())) {
                historico.add(toPagamentoDto(p));
            }
        }
        historico.sort(Comparator.comparing(PortalPagamentoDTO::getDataPagamento).reversed());
        if (historico.size() > 50) {
            historico = historico.subList(0, 50);
        }
        return PortalExtratoDTO.builder()
                .cliente(cliente)
                .dividasAbertas(abertas)
                .historicoPagamentos(historico)
                .build();
    }

    private boolean filtrarPorStatus(Divida divida, String statusFiltro) {
        if (statusFiltro == null || statusFiltro.isBlank() || "todas".equalsIgnoreCase(statusFiltro)) {
            return true;
        }
        if ("abertas".equalsIgnoreCase(statusFiltro)) {
            return StatusDivida.emAberto().contains(divida.getStatusDivida())
                    && divida.getValorDevedor().compareTo(BigDecimal.ZERO) > 0;
        }
        return true;
    }

    private PortalDividaDTO toDividaResumo(Divida divida) {
        LocalDate hoje = LocalDate.now();
        int diasAtraso = divida.getVencimento().isBefore(hoje)
                ? (int) ChronoUnit.DAYS.between(divida.getVencimento(), hoje) : 0;
        BigDecimal[] valorEJuros = dividaService.getValorEJurosReais(divida);
        BigDecimal valorComJuros = valorEJuros != null && valorEJuros.length > 0
                ? valorEJuros[0] : MoneyUtil.centavosParaReais(divida.getValorDevedor());
        BigDecimal juros = valorEJuros != null && valorEJuros.length > 1 ? valorEJuros[1] : BigDecimal.ZERO;
        return PortalDividaDTO.builder()
                .dividaId(divida.getDividaId())
                .protocolo(divida.getProtocolo())
                .descricao(divida.getDescricao())
                .competencia(divida.getCompetencia())
                .vencimento(divida.getVencimento())
                .valorOriginal(MoneyUtil.centavosParaReais(divida.getValorOriginal()))
                .valorDevedor(valorComJuros)
                .juros(juros)
                .status(divida.getStatusDivida().name())
                .diasAtraso(diasAtraso)
                .build();
    }

    private PortalPagamentoDTO toPagamentoDto(Pagamento pagamento) {
        return PortalPagamentoDTO.builder()
                .pagamentoId(pagamento.getPagamentoId())
                .dataPagamento(pagamento.getDataPagamento())
                .valorPago(MoneyUtil.centavosParaReais(pagamento.getValorPago()))
                .metodoPagamento(pagamento.getMetodoPagamento())
                .build();
    }
}
