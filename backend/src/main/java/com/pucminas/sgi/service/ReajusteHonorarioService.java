package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ReajusteHonorarioRequestDTO;
import com.pucminas.sgi.dto.response.ReajusteHonorarioItemDTO;
import com.pucminas.sgi.dto.response.ReajusteHonorarioResumoDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.HonorarioClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ReajusteHonorarioService {

    private static final BigDecimal PERCENTUAL_MAXIMO = new BigDecimal("100.00");

    private final ClienteRepository clienteRepository;
    private final HonorarioClienteRepository honorarioRepository;
    private final HonorarioClienteService honorarioService;
    private final AuditoriaService auditoriaService;

    public ReajusteHonorarioService(ClienteRepository clienteRepository,
                                    HonorarioClienteRepository honorarioRepository,
                                    HonorarioClienteService honorarioService,
                                    AuditoriaService auditoriaService) {
        this.clienteRepository = clienteRepository;
        this.honorarioRepository = honorarioRepository;
        this.honorarioService = honorarioService;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public ReajusteHonorarioResumoDTO simular(ReajusteHonorarioRequestDTO request) {
        validarRequest(request);
        List<ReajusteHonorarioItemDTO> detalhes = clientesAlvo(request).stream()
                .map(cliente -> simularCliente(cliente, request))
                .toList();
        return resumo(detalhes, false);
    }

    @Transactional
    public ReajusteHonorarioResumoDTO aplicar(ReajusteHonorarioRequestDTO request) {
        validarRequest(request);
        List<ReajusteHonorarioItemDTO> detalhes = new ArrayList<>();
        for (Cliente cliente : clientesAlvo(request)) {
            ReajusteHonorarioItemDTO item = simularCliente(cliente, request);
            if (Boolean.TRUE.equals(item.getElegivel())) {
                HonorarioCliente novo = honorarioService.criarNovoHonorario(
                        cliente,
                        HonorarioClienteService.reaisParaCentavos(item.getNovoValor()),
                        request.getDataInicioVigencia(),
                        request.getPercentualReajuste(),
                        request.getObservacao(),
                        usuarioSistemaOuLote());
                auditoriaService.registrar("REAJUSTE_HONORARIO_APLICADO", "HonorarioCliente",
                        novo.getHonorarioId(), "clienteId=" + cliente.getClienteId()
                                + ", percentual=" + request.getPercentualReajuste());
            }
            detalhes.add(item);
        }
        ReajusteHonorarioResumoDTO resumo = resumo(detalhes, true);
        auditoriaService.registrar("REAJUSTE_HONORARIO_LOTE", "HonorarioCliente", null,
                "processados=" + resumo.getClientesProcessados() + ", aplicados=" + resumo.getReajustesAplicados()
                        + ", erros=" + resumo.getErros());
        return resumo;
    }

    private ReajusteHonorarioItemDTO simularCliente(Cliente cliente, ReajusteHonorarioRequestDTO request) {
        try {
            if (cliente.getStatusCliente() != StatusCliente.ATIVO) {
                return impedimento(cliente, request, "Cliente inativo.");
            }
            if (!honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), request.getDataInicioVigencia()).isEmpty()) {
                return impedimento(cliente, request, "Vigência futura já cadastrada.");
            }
            LocalDate dataBase = request.getDataInicioVigencia().minusDays(1);
            HonorarioCliente vigente = honorarioRepository.findVigenteNaData(cliente.getClienteId(), dataBase)
                    .orElseThrow(() -> new BusinessRuleException("Cliente sem honorário vigente."));
            BigDecimal valorAtual = HonorarioClienteService.centavosParaReais(vigente.getValor());
            BigDecimal fator = BigDecimal.ONE.add(request.getPercentualReajuste().divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP));
            BigDecimal novoValor = valorAtual.multiply(fator).setScale(2, RoundingMode.HALF_UP);
            return ReajusteHonorarioItemDTO.builder()
                    .clienteId(cliente.getClienteId())
                    .clienteNome(cliente.getNome())
                    .valorAtual(valorAtual)
                    .percentualAplicado(request.getPercentualReajuste())
                    .novoValor(novoValor)
                    .dataInicioVigencia(request.getDataInicioVigencia())
                    .elegivel(true)
                    .build();
        } catch (Exception e) {
            return impedimento(cliente, request, e.getMessage());
        }
    }

    private ReajusteHonorarioItemDTO impedimento(Cliente cliente, ReajusteHonorarioRequestDTO request, String erro) {
        return ReajusteHonorarioItemDTO.builder()
                .clienteId(cliente.getClienteId())
                .clienteNome(cliente.getNome())
                .percentualAplicado(request.getPercentualReajuste())
                .dataInicioVigencia(request.getDataInicioVigencia())
                .elegivel(false)
                .erro(erro)
                .build();
    }

    private ReajusteHonorarioResumoDTO resumo(List<ReajusteHonorarioItemDTO> detalhes, boolean aplicado) {
        int elegiveis = (int) detalhes.stream().filter(i -> Boolean.TRUE.equals(i.getElegivel())).count();
        int erros = detalhes.size() - elegiveis;
        return ReajusteHonorarioResumoDTO.builder()
                .clientesProcessados(detalhes.size())
                .reajustesAplicados(aplicado ? elegiveis : 0)
                .erros(erros)
                .detalhes(detalhes)
                .build();
    }

    private List<Cliente> clientesAlvo(ReajusteHonorarioRequestDTO request) {
        if (Boolean.TRUE.equals(request.getAplicarTodos())) {
            return clienteRepository.findByStatusCliente(StatusCliente.ATIVO);
        }
        if (request.getClienteIds() == null || request.getClienteIds().isEmpty()) {
            throw new BusinessRuleException("Informe clientes ou marque aplicarTodos.");
        }
        return clienteRepository.findAllById(request.getClienteIds());
    }

    private void validarRequest(ReajusteHonorarioRequestDTO request) {
        if (request.getPercentualReajuste() == null
                || request.getPercentualReajuste().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Percentual de reajuste deve ser maior que zero.");
        }
        if (request.getPercentualReajuste().compareTo(PERCENTUAL_MAXIMO) > 0) {
            throw new BusinessRuleException("Percentual de reajuste excede o limite permitido de 100%.");
        }
        if (request.getDataInicioVigencia() == null) {
            throw new BusinessRuleException("Data de início da vigência é obrigatória.");
        }
    }

    private String usuarioSistemaOuLote() {
        return "LOTE";
    }
}
