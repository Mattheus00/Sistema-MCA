package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ConfiguracaoCobrancaDTO;
import com.pucminas.sgi.dto.response.ConfiguracaoCobrancaResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.ConfiguracaoCobranca;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.ConfiguracaoCobrancaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ConfiguracaoCobrancaService {

    private final ConfiguracaoCobrancaRepository configuracaoRepository;
    private final ClienteRepository clienteRepository;
    private final AuditoriaService auditoriaService;

    public ConfiguracaoCobrancaService(ConfiguracaoCobrancaRepository configuracaoRepository,
                                       ClienteRepository clienteRepository,
                                       AuditoriaService auditoriaService) {
        this.configuracaoRepository = configuracaoRepository;
        this.clienteRepository = clienteRepository;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public ConfiguracaoCobrancaResponseDTO consultar(UUID clienteId) {
        ConfiguracaoCobranca cfg = configuracaoRepository.findByCliente_ClienteId(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Configuração de cobrança do cliente", clienteId));
        return toResponse(cfg);
    }

    @Transactional
    public ConfiguracaoCobrancaResponseDTO salvar(UUID clienteId, ConfiguracaoCobrancaDTO dto) {
        validar(dto);
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        ConfiguracaoCobranca cfg = configuracaoRepository.findByCliente_ClienteId(clienteId)
                .orElseGet(() -> ConfiguracaoCobranca.builder().cliente(cliente).build());
        cfg.setCobrancaRecorrenteAtiva(Boolean.TRUE.equals(dto.getCobrancaRecorrenteAtiva()));
        cfg.setDiaVencimento(dto.getDiaVencimento());
        cfg.setTaxaBalancoAtiva(Boolean.TRUE.equals(dto.getTaxaBalancoAtiva()));
        cfg = configuracaoRepository.save(cfg);
        auditoriaService.registrar("CONFIGURACAO_COBRANCA_SALVA", "ConfiguracaoCobranca",
                cfg.getConfiguracaoId(), "clienteId=" + clienteId);
        return toResponse(cfg);
    }

    private void validar(ConfiguracaoCobrancaDTO dto) {
        if (dto.getDiaVencimento() == null || dto.getDiaVencimento() < 1 || dto.getDiaVencimento() > 31) {
            throw new BusinessRuleException("Dia de vencimento deve estar entre 1 e 31.");
        }
    }

    private ConfiguracaoCobrancaResponseDTO toResponse(ConfiguracaoCobranca cfg) {
        Cliente c = cfg.getCliente();
        return ConfiguracaoCobrancaResponseDTO.builder()
                .configuracaoId(cfg.getConfiguracaoId())
                .clienteId(c.getClienteId())
                .clienteNome(c.getNome())
                .cobrancaRecorrenteAtiva(cfg.isCobrancaRecorrenteAtiva())
                .diaVencimento(cfg.getDiaVencimento())
                .taxaBalancoAtiva(cfg.isTaxaBalancoAtiva())
                .criadoEm(cfg.getCriadoEm())
                .atualizadoEm(cfg.getAtualizadoEm())
                .build();
    }
}
