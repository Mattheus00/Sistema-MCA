package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.LivroCaixaRecorrenciaRequestDTO;
import com.pucminas.sgi.dto.response.LivroCaixaRecorrenciaResponseDTO;
import com.pucminas.sgi.entity.*;
import com.pucminas.sgi.enums.*;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.repository.LivroCaixaRecorrenciaRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LivroCaixaRecorrenciaService {

    private final LivroCaixaRecorrenciaRepository recorrenciaRepository;
    private final LivroCaixaCategoriaService categoriaService;
    private final ContaFinanceiraService contaService;
    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final StaffAccessService staffAccessService;

    public LivroCaixaRecorrenciaService(LivroCaixaRecorrenciaRepository recorrenciaRepository,
                                        LivroCaixaCategoriaService categoriaService,
                                        ContaFinanceiraService contaService,
                                        LivroCaixaMovimentacaoRepository movimentacaoRepository,
                                        ClienteRepository clienteRepository,
                                        UsuarioRepository usuarioRepository,
                                        StaffAccessService staffAccessService) {
        this.recorrenciaRepository = recorrenciaRepository;
        this.categoriaService = categoriaService;
        this.contaService = contaService;
        this.movimentacaoRepository = movimentacaoRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.staffAccessService = staffAccessService;
    }

    @Transactional(readOnly = true)
    public List<LivroCaixaRecorrenciaResponseDTO> listar(UUID usuarioId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        return recorrenciaRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LivroCaixaRecorrenciaResponseDTO criar(UUID usuarioId, LivroCaixaRecorrenciaRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaCategoria categoria = categoriaService.requireAtiva(dto.getCategoriaId());
        if (categoria.getTipo() != dto.getTipo()) {
            throw new BusinessRuleException("Categoria incompatível com o tipo da recorrência.");
        }
        validarRecorrencia(dto);
        String usuarioLogin = login(usuarioId);
        Cliente cliente = null;
        if (dto.getClienteId() != null) {
            cliente = clienteRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente", dto.getClienteId()));
        }
        LivroCaixaRecorrencia salva = recorrenciaRepository.save(LivroCaixaRecorrencia.builder()
                .descricao(dto.getDescricao().trim())
                .tipo(dto.getTipo())
                .valorCentavos(LivroCaixaSupport.reaisParaCentavos(dto.getValor()))
                .categoria(categoria)
                .conta(dto.getContaId() != null ? contaService.requireAtiva(dto.getContaId()) : null)
                .cliente(cliente)
                .fornecedor(dto.getFornecedor())
                .formaPagamento(dto.getFormaPagamento())
                .recorrencia(dto.getRecorrencia())
                .intervaloDias(dto.getIntervaloDias())
                .dataInicio(dto.getDataInicio())
                .dataFim(dto.getDataFim())
                .proximaGeracao(dto.getDataInicio())
                .observacao(dto.getObservacao())
                .criadoPor(usuarioLogin)
                .ativo(true)
                .build());
        return toDto(salva);
    }

    @Transactional
    public void processarRecorrenciasVencidas() {
        List<LivroCaixaRecorrencia> pendentes = recorrenciaRepository
                .findByAtivoTrueAndProximaGeracaoLessThanEqualOrderByProximaGeracaoAsc(LocalDate.now());
        for (LivroCaixaRecorrencia rec : pendentes) {
            gerarMovimentacao(rec);
            rec.setProximaGeracao(calcularProximaData(rec, rec.getProximaGeracao()));
            if (rec.getDataFim() != null && rec.getProximaGeracao().isAfter(rec.getDataFim())) {
                rec.setAtivo(false);
            }
            recorrenciaRepository.save(rec);
        }
    }

    private void gerarMovimentacao(LivroCaixaRecorrencia rec) {
        LivroCaixaStatusMovimentacao status = rec.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA
                ? LivroCaixaStatusMovimentacao.PREVISTO
                : LivroCaixaStatusMovimentacao.PREVISTO;
        movimentacaoRepository.save(LivroCaixaMovimentacao.builder()
                .tipo(rec.getTipo())
                .descricao(rec.getDescricao())
                .valorCentavos(rec.getValorCentavos())
                .categoria(rec.getCategoria())
                .cliente(rec.getCliente())
                .dataMovimentacao(rec.getProximaGeracao())
                .dataVencimento(rec.getProximaGeracao())
                .status(status)
                .formaPagamento(rec.getFormaPagamento())
                .conta(rec.getConta())
                .fornecedor(rec.getFornecedor())
                .observacao(rec.getObservacao())
                .origem(LivroCaixaOrigemMovimentacao.RECORRENTE)
                .recorrencia(rec)
                .criadoPor(AuditoriaService.USUARIO_SISTEMA)
                .atualizadoPor(AuditoriaService.USUARIO_SISTEMA)
                .build());
    }

    private LocalDate calcularProximaData(LivroCaixaRecorrencia rec, LocalDate atual) {
        return switch (rec.getRecorrencia()) {
            case SEMANAL -> atual.plusWeeks(1);
            case MENSAL -> atual.plusMonths(1);
            case ANUAL -> atual.plusYears(1);
            case PERSONALIZADA -> atual.plusDays(rec.getIntervaloDias() != null ? rec.getIntervaloDias() : 30);
        };
    }

    private void validarRecorrencia(LivroCaixaRecorrenciaRequestDTO dto) {
        if (dto.getRecorrencia() == LivroCaixaRecorrenciaTipo.PERSONALIZADA
                && (dto.getIntervaloDias() == null || dto.getIntervaloDias() <= 0)) {
            throw new BusinessRuleException("Informe intervaloDias para recorrência personalizada.");
        }
    }

    private String login(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId).map(Usuario::getTelefone).orElse(usuarioId.toString());
    }

    private LivroCaixaRecorrenciaResponseDTO toDto(LivroCaixaRecorrencia rec) {
        return LivroCaixaRecorrenciaResponseDTO.builder()
                .id(rec.getId())
                .descricao(rec.getDescricao())
                .tipo(rec.getTipo())
                .valor(LivroCaixaSupport.centavosParaReais(rec.getValorCentavos()))
                .categoriaId(rec.getCategoria().getId())
                .categoriaNome(rec.getCategoria().getNome())
                .contaId(rec.getConta() != null ? rec.getConta().getId() : null)
                .clienteId(rec.getCliente() != null ? rec.getCliente().getClienteId() : null)
                .fornecedor(rec.getFornecedor())
                .formaPagamento(rec.getFormaPagamento())
                .recorrencia(rec.getRecorrencia())
                .intervaloDias(rec.getIntervaloDias())
                .dataInicio(rec.getDataInicio())
                .dataFim(rec.getDataFim())
                .proximaGeracao(rec.getProximaGeracao())
                .ativo(rec.isAtivo())
                .observacao(rec.getObservacao())
                .criadoPor(rec.getCriadoPor())
                .criadoEm(rec.getCriadoEm())
                .build();
    }
}
