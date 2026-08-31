package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ContaFinanceiraRequestDTO;
import com.pucminas.sgi.dto.response.ContaFinanceiraResponseDTO;
import com.pucminas.sgi.entity.ContaFinanceira;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ContaFinanceiraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContaFinanceiraService {

    private final ContaFinanceiraRepository contaRepository;
    private final StaffAccessService staffAccessService;

    public ContaFinanceiraService(ContaFinanceiraRepository contaRepository,
                                  StaffAccessService staffAccessService) {
        this.contaRepository = contaRepository;
        this.staffAccessService = staffAccessService;
    }

    @Transactional(readOnly = true)
    public List<ContaFinanceiraResponseDTO> listar(UUID usuarioId, boolean incluirInativas) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        List<ContaFinanceira> lista = incluirInativas
                ? contaRepository.findAll()
                : contaRepository.findByAtivoTrueOrderByNomeAsc();
        return lista.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public ContaFinanceiraResponseDTO criar(UUID usuarioId, ContaFinanceiraRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        contaRepository.findByNomeIgnoreCase(dto.getNome().trim())
                .ifPresent(c -> {
                    throw new BusinessRuleException("Já existe conta financeira com este nome.");
                });
        ContaFinanceira salva = contaRepository.save(ContaFinanceira.builder()
                .nome(dto.getNome().trim())
                .tipo(dto.getTipo())
                .saldoInicialCentavos(dto.getSaldoInicial() != null
                        ? LivroCaixaSupport.reaisParaCentavos(dto.getSaldoInicial())
                        : BigDecimal.ZERO)
                .ativo(true)
                .build());
        return toDto(salva);
    }

    @Transactional
    public ContaFinanceiraResponseDTO atualizar(UUID usuarioId, UUID id, ContaFinanceiraRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        ContaFinanceira conta = contaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta financeira", id));
        conta.setNome(dto.getNome().trim());
        conta.setTipo(dto.getTipo());
        if (dto.getSaldoInicial() != null) {
            conta.setSaldoInicialCentavos(LivroCaixaSupport.reaisParaCentavos(dto.getSaldoInicial()));
        }
        return toDto(contaRepository.save(conta));
    }

    @Transactional
    public void desativar(UUID usuarioId, UUID id) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        ContaFinanceira conta = contaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta financeira", id));
        conta.setAtivo(false);
        contaRepository.save(conta);
    }

    @Transactional(readOnly = true)
    public ContaFinanceira requireAtiva(UUID contaId) {
        ContaFinanceira conta = contaRepository.findById(contaId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta financeira", contaId));
        if (!conta.isAtivo()) {
            throw new BusinessRuleException("Conta financeira inativa.");
        }
        return conta;
    }

    private ContaFinanceiraResponseDTO toDto(ContaFinanceira c) {
        return ContaFinanceiraResponseDTO.builder()
                .id(c.getId())
                .nome(c.getNome())
                .tipo(c.getTipo())
                .saldoInicial(LivroCaixaSupport.centavosParaReais(c.getSaldoInicialCentavos()))
                .ativo(c.isAtivo())
                .criadoEm(c.getCriadoEm())
                .build();
    }
}
