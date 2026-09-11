package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.DividaDTO;
import com.pucminas.sgi.dto.request.ItemServicoDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.DividaServico;
import com.pucminas.sgi.entity.Servico;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.enums.TipoCobranca;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.DividaMapper;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import com.pucminas.sgi.repository.ServicoRepository;
import com.pucminas.sgi.util.VencimentoUtil;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço de dívidas: registro, consulta, listagem e atualização de status.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DividaService {

    private final DividaRepository dividaRepository;
    private final ClienteRepository clienteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PagamentoRepository pagamentoRepository;
    private final ServicoRepository servicoRepository;
    private final DividaMapper dividaMapper;
    private final Clock clock;

    @Transactional
    public DividaResponseDTO registrarDivida(DividaDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", dto.getClienteId()));
        LocalDate vencimento = dto.getVencimento() != null ? dto.getVencimento() : VencimentoUtil.getVencimentoPadrao();
        String protocolo = gerarProtocolo();
        Divida d = Divida.builder()
                .cliente(cliente)
                .valorOriginal(dto.getValorOriginal())
                .valorDevedor(dto.getValorOriginal())
                .vencimento(vencimento)
                .descricao(dto.getDescricao())
                .tipoCobranca(dto.getTipoCobranca() != null ? dto.getTipoCobranca() : TipoCobranca.COBRANCA_MANUAL)
                .competencia(dto.getCompetencia())
                .geradaAutomaticamente(Boolean.TRUE.equals(dto.getGeradaAutomaticamente()))
                .origemCobranca(dto.getOrigemCobranca())
                .anoTaxaBalanco(dto.getAnoTaxaBalanco())
                .statusDivida(LocalDate.now(clock).isAfter(vencimento) ? StatusDivida.VENCIDA : StatusDivida.EM_ABERTO)
                .protocolo(protocolo)
                .criadoEm(LocalDateTime.now())
                .atualizadoEm(LocalDateTime.now())
                .build();
        if (dto.getItensServicos() != null && !dto.getItensServicos().isEmpty()) {
            for (ItemServicoDTO item : dto.getItensServicos()) {
                Servico servico = servicoRepository.findById(item.getServicoId())
                        .orElseThrow(() -> new ResourceNotFoundException("Serviço", item.getServicoId()));
                DividaServico ds = DividaServico.builder()
                        .divida(d)
                        .servico(servico)
                        .valor(item.getValor() != null ? item.getValor() : BigDecimal.ZERO)
                        .build();
                d.getItensServicos().add(ds);
            }
        }
        d = dividaRepository.save(d);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(cliente.getClienteId()));
        log.info("Dívida registrada: {} - {}", d.getDividaId(), protocolo);
        return dividaMapper.toResponse(d);
    }

    private String gerarProtocolo() {
        String data = LocalDate.now(clock).format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String uuidCurto = UUID.randomUUID().toString().substring(0, 8).toUpperCase().replace("-", "");
        return "DIV-" + data + "-" + uuidCurto;
    }

    @Transactional(readOnly = true)
    public DividaResponseDTO consultarDivida(UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        return dividaMapper.toResponse(d);
    }

    @Transactional(readOnly = true)
    public List<DividaResponseDTO> listarDividasPorCliente(UUID clienteId) {
        return dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .map(dividaMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<DividaResponseDTO> listarDividas(UUID clienteId, List<StatusDivida> status, LocalDate inicio, LocalDate fim, Pageable pageable) {
        if (clienteId != null) {
            List<Divida> list = dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId);
            if (status != null && !status.isEmpty()) {
                list = list.stream().filter(d -> status.contains(d.getStatusDivida())).collect(Collectors.toList());
            }
            if (inicio != null) {
                list = list.stream().filter(d -> !d.getVencimento().isBefore(inicio)).collect(Collectors.toList());
            }
            if (fim != null) {
                list = list.stream().filter(d -> !d.getVencimento().isAfter(fim)).collect(Collectors.toList());
            }
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), list.size());
            return new org.springframework.data.domain.PageImpl<>(
                    list.subList(start, end).stream().map(dividaMapper::toResponse).collect(Collectors.toList()),
                    pageable,
                    list.size()
            );
        }
        if (inicio != null && fim != null) {
            return dividaRepository.findByVencimentoBetween(inicio, fim, pageable).map(dividaMapper::toResponse);
        }
        if (status != null && !status.isEmpty()) {
            return dividaRepository.findByStatusDividaIn(status, pageable).map(dividaMapper::toResponse);
        }
        return dividaRepository.findAll(pageable).map(dividaMapper::toResponse);
    }

    @Transactional
    public void atualizarStatusDivida(UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(dividaId);
        if (totalPago == null) totalPago = BigDecimal.ZERO;
        LocalDate hoje = LocalDate.now(clock);
        BigDecimal valorDevedor = DividaMapper.calcularSaldoDevedorCentavos(d, totalPago, hoje);
        d.setValorDevedor(valorDevedor);
        if (valorDevedor.compareTo(BigDecimal.ZERO) <= 0) {
            d.setStatusDivida(StatusDivida.QUITADA);
        } else if (totalPago.compareTo(BigDecimal.ZERO) > 0) {
            d.setStatusDivida(StatusDivida.PARCIAL);
        } else if (hoje.isAfter(d.getVencimento())) {
            d.setStatusDivida(StatusDivida.VENCIDA);
        } else {
            d.setStatusDivida(StatusDivida.EM_ABERTO);
        }
        dividaRepository.save(d);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(d.getCliente().getClienteId()));
    }

    /**
     * Atualiza valorDevedor das dívidas em atraso com multa (0,33% ao dia, máx. 9,99%) e juros (2% ao mês).
     * Saldo = (principal + multa + juros) − totalPago (pagamentos podem incluir juros).
     */
    @Transactional
    public void atualizarValorComMultaJuros() {
        LocalDate hoje = LocalDate.now(clock);
        List<Divida> emAberto = dividaRepository.findByStatusDividaIn(StatusDivida.emAberto());
        for (Divida d : emAberto) {
            if (!hoje.isAfter(d.getVencimento())) continue;
            BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(d.getDividaId());
            if (totalPago == null) totalPago = BigDecimal.ZERO;
            BigDecimal valorAtualizado = DividaMapper.calcularSaldoDevedorCentavos(d, totalPago, hoje);
            d.setValorDevedor(valorAtualizado);
            if (valorAtualizado.compareTo(BigDecimal.ZERO) <= 0) {
                d.setStatusDivida(StatusDivida.QUITADA);
            }
            dividaRepository.save(d);
        }
        log.info("Atualização de multa e juros concluída");
    }

    /**
     * Job: marca dívidas vencidas cujo vencimento já passou.
     */
    @Transactional
    public void verificarDividasVencidas() {
        List<Divida> emAberto = dividaRepository.findByStatusDividaIn(List.of(StatusDivida.EM_ABERTO));
        LocalDate hoje = LocalDate.now(clock);
        for (Divida d : emAberto) {
            if (hoje.isAfter(d.getVencimento())) {
                d.setStatusDivida(StatusDivida.VENCIDA);
                dividaRepository.save(d);
            }
        }
        log.info("Verificação de dívidas vencidas concluída");
    }

    /** Exposto para ClienteService e InadimplenciaService. */
    public DividaResponseDTO toResponseDTO(Divida d) {
        return dividaMapper.toResponse(d);
    }

    /** Retorna [valorDevedorReais, jurosReais] calculados em tempo real. Para InadimplenciaService. */
    public BigDecimal[] getValorEJurosReais(Divida d) {
        return dividaMapper.computarValorEJurosEmTempoReal(d);
    }
}
