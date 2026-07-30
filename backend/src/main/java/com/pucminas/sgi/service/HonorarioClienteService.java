package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.HonorarioClienteDTO;
import com.pucminas.sgi.dto.response.HonorarioClienteResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.HonorarioClienteRepository;
import com.pucminas.sgi.util.MoneyUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class HonorarioClienteService {

    private final HonorarioClienteRepository honorarioRepository;
    private final ClienteRepository clienteRepository;
    private final AuditoriaService auditoriaService;

    public HonorarioClienteService(HonorarioClienteRepository honorarioRepository,
                                   ClienteRepository clienteRepository,
                                   AuditoriaService auditoriaService) {
        this.honorarioRepository = honorarioRepository;
        this.clienteRepository = clienteRepository;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public List<HonorarioClienteResponseDTO> listarHistorico(UUID clienteId) {
        garantirClienteExiste(clienteId);
        return honorarioRepository.findByCliente_ClienteIdOrderByDataInicioVigenciaDesc(clienteId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HonorarioClienteResponseDTO consultarAtual(UUID clienteId) {
        garantirClienteExiste(clienteId);
        HonorarioCliente h = buscarVigente(clienteId, LocalDate.now());
        return toResponse(h);
    }

    @Transactional
    public HonorarioClienteResponseDTO cadastrarNovoValor(UUID clienteId, HonorarioClienteDTO dto) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        validarClienteAtivo(cliente);
        validarValorEData(dto.getValor(), dto.getDataInicioVigencia());
        HonorarioCliente novo = criarNovoHonorario(cliente, reaisParaCentavos(dto.getValor()),
                dto.getDataInicioVigencia(), null, dto.getObservacao(), null);
        auditoriaService.registrar("HONORARIO_CADASTRADO", "HonorarioCliente", novo.getHonorarioId(),
                "clienteId=" + clienteId + ", inicio=" + dto.getDataInicioVigencia());
        return toResponse(novo);
    }

    @Transactional(readOnly = true)
    public HonorarioCliente buscarVigente(UUID clienteId, LocalDate data) {
        return honorarioRepository.findVigenteNaData(clienteId, data)
                .orElseThrow(() -> new BusinessRuleException("Cliente sem honorário vigente para a competência informada."));
    }

    @Transactional
    public HonorarioCliente criarNovoHonorario(Cliente cliente,
                                               BigDecimal valorCentavos,
                                               LocalDate inicio,
                                               BigDecimal percentualReajuste,
                                               String observacao,
                                               String criadoPor) {
        if (valorCentavos == null || valorCentavos.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Valor do honorário deve ser maior que zero.");
        }
        if (inicio == null) {
            throw new BusinessRuleException("Data de início da vigência é obrigatória.");
        }
        if (!honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), inicio).isEmpty()) {
            throw new BusinessRuleException("Já existe honorário futuro cadastrado para este cliente.");
        }

        HonorarioCliente vigente = honorarioRepository.findVigenteNaData(cliente.getClienteId(), inicio).orElse(null);
        if (vigente != null && vigente.getDataInicioVigencia().equals(inicio)) {
            throw new BusinessRuleException("Já existe honorário vigente iniciando nessa data.");
        }
        if (vigente != null) {
            vigente.setDataFimVigencia(inicio.minusDays(1));
            honorarioRepository.save(vigente);
        } else if (honorarioRepository.countSobreposicoes(cliente.getClienteId(), inicio, inicio) > 0) {
            throw new BusinessRuleException("Período de vigência sobreposto.");
        }

        HonorarioCliente novo = HonorarioCliente.builder()
                .cliente(cliente)
                .valor(valorCentavos)
                .dataInicioVigencia(inicio)
                .percentualReajuste(percentualReajuste)
                .observacao(observacao)
                .criadoPor(criadoPor)
                .ativo(true)
                .build();
        return honorarioRepository.save(novo);
    }

    public HonorarioClienteResponseDTO toResponse(HonorarioCliente h) {
        Cliente c = h.getCliente();
        return HonorarioClienteResponseDTO.builder()
                .honorarioId(h.getHonorarioId())
                .clienteId(c.getClienteId())
                .clienteNome(c.getNome())
                .valor(MoneyUtil.centavosParaReais(h.getValor()))
                .dataInicioVigencia(h.getDataInicioVigencia())
                .dataFimVigencia(h.getDataFimVigencia())
                .percentualReajuste(h.getPercentualReajuste())
                .observacao(h.getObservacao())
                .criadoEm(h.getCriadoEm())
                .criadoPor(h.getCriadoPor())
                .ativo(h.isAtivo())
                .build();
    }

    static BigDecimal reaisParaCentavos(BigDecimal reais) {
        return reais == null ? BigDecimal.ZERO : reais.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);
    }

    static BigDecimal centavosParaReais(BigDecimal centavos) {
        return MoneyUtil.centavosParaReais(centavos);
    }

    private void validarValorEData(BigDecimal valor, LocalDate inicio) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Valor do honorário deve ser maior que zero.");
        }
        if (inicio == null) {
            throw new BusinessRuleException("Data de início da vigência é obrigatória.");
        }
    }

    private Cliente garantirClienteExiste(UUID clienteId) {
        return clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
    }

    private void validarClienteAtivo(Cliente cliente) {
        if (cliente.getStatusCliente() != StatusCliente.ATIVO) {
            throw new BusinessRuleException("Cliente inativo não pode receber configuração de honorário.");
        }
    }
}
