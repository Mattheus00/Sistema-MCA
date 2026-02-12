package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.DividaDTO;
import com.pucminas.sgi.dto.request.InadimplenciaPayloadDTO;
import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.dto.response.InadimplenciaResponseDTO;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import com.pucminas.sgi.repository.DividaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InadimplenciaService {

    private static final Logger log = LoggerFactory.getLogger(InadimplenciaService.class);

    private final DividaRepository dividaRepository;
    private final DividaService dividaService;
    private final PagamentoService pagamentoService;
    private final ApplicationEventPublisher eventPublisher;

    public InadimplenciaService(DividaRepository dividaRepository,
                                DividaService dividaService,
                                PagamentoService pagamentoService,
                                ApplicationEventPublisher eventPublisher) {
        this.dividaRepository = dividaRepository;
        this.dividaService = dividaService;
        this.pagamentoService = pagamentoService;
        this.eventPublisher = eventPublisher;
    }

    private static final List<StatusDivida> STATUS_NAO_CANCELADOS =
            List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.QUITADA, StatusDivida.VENCIDA);

    @Transactional(readOnly = true)
    public Page<InadimplenciaResponseDTO> listar(Pageable pageable) {
        return dividaRepository.findByStatusDividaIn(STATUS_NAO_CANCELADOS, pageable).map(this::toInadimplenciaDTO);
    }

    @Transactional(readOnly = true)
    public List<InadimplenciaResponseDTO> listarTodas() {
        return dividaRepository.findByStatusDividaIn(STATUS_NAO_CANCELADOS).stream()
                .map(this::toInadimplenciaDTO).collect(Collectors.toList());
    }

    @Transactional
    public InadimplenciaResponseDTO criar(InadimplenciaPayloadDTO payload) {
        java.time.LocalDate vencimento = payload.getVencimento() != null
                ? payload.getVencimento()
                : com.pucminas.sgi.util.VencimentoUtil.getVencimentoPadrao();
        // Front envia valor em REAIS; backend armazena em centavos
        BigDecimal valorCentavos = payload.getValor()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP);
        DividaDTO dto = DividaDTO.builder()
                .clienteId(payload.getClienteId())
                .valorOriginal(valorCentavos)
                .vencimento(vencimento)
                .descricao(payload.getDescricao())
                .build();
        var response = dividaService.registrarDivida(dto);
        Divida d = dividaRepository.findById(response.getDividaId())
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", response.getDividaId()));
        return toInadimplenciaDTO(d);
    }

    @Transactional
    public InadimplenciaResponseDTO confirmarPagamento(UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        if (d.getValorDevedor().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Dívida já está quitada.");
        }
        PagamentoDTO pag = PagamentoDTO.builder()
                .dividaId(dividaId)
                .valorPago(d.getValorDevedor())
                .dataPagamento(LocalDate.now())
                .metodoPagamento("Confirmado (PATCH)")
                .build();
        pagamentoService.registrarPagamento(pag);
        d = dividaRepository.findById(dividaId).orElseThrow();
        log.info("Pagamento confirmado para dívida {}", dividaId);
        return toInadimplenciaDTO(d);
    }

    /** Cancela a inadimplência (soft delete). Não aparece mais na listagem GET. */
    @Transactional
    public void cancelar(UUID dividaId) {
        Divida d = dividaRepository.findByIdWithCliente(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        UUID clienteId = d.getCliente().getClienteId();
        d.setStatusDivida(StatusDivida.CANCELADA);
        dividaRepository.save(d);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(clienteId));
        log.info("Inadimplência cancelada: {}", dividaId);
    }

    private static String statusParaFrontend(StatusDivida s) {
        return switch (s) {
            case QUITADA -> "Pago";
            case PARCIAL -> "Acordo";
            case CANCELADA -> "Cancelado";
            case EM_ABERTO, VENCIDA -> "EmAberto";
        };
    }

    private InadimplenciaResponseDTO toInadimplenciaDTO(Divida d) {
        // Retorna valor em REAIS para o front exibir direto (evita confusão centavos/reais)
        BigDecimal valorReais = d.getValorDevedor().divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return InadimplenciaResponseDTO.builder()
                .dividaId(d.getDividaId())
                .clienteId(d.getCliente().getClienteId())
                .clienteNome(d.getCliente().getNome())
                .valor(valorReais)
                .vencimento(d.getVencimento())
                .descricao(d.getDescricao())
                .status(statusParaFrontend(d.getStatusDivida()))
                .criadoEm(d.getCriadoEm())
                .atualizadoEm(d.getAtualizadoEm())
                .build();
    }
}
