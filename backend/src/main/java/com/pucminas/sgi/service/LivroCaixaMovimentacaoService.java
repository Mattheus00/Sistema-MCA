package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.LivroCaixaMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.request.MarcarMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.entity.*;
import com.pucminas.sgi.enums.*;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.LivroCaixaMovimentacaoMapper;
import com.pucminas.sgi.repository.*;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LivroCaixaMovimentacaoService {

    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final LivroCaixaHistoricoRepository historicoRepository;
    private final LivroCaixaAnexoRepository anexoRepository;
    private final LivroCaixaCategoriaService categoriaService;
    private final ContaFinanceiraService contaService;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final StaffAccessService staffAccessService;
    private final AuditoriaService auditoriaService;
    private final LivroCaixaMovimentacaoMapper movimentacaoMapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Page<LivroCaixaMovimentacaoResponseDTO> listar(UUID usuarioId,
                                                         LivroCaixaTipoMovimentacao tipo,
                                                         LivroCaixaStatusMovimentacao status,
                                                         UUID categoriaId,
                                                         UUID contaId,
                                                         UUID clienteId,
                                                         FormaPagamentoLivroCaixa formaPagamento,
                                                         LocalDate dataInicio,
                                                         LocalDate dataFim,
                                                         BigDecimal valorMin,
                                                         BigDecimal valorMax,
                                                         String busca,
                                                         Pageable pageable) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        Page<LivroCaixaMovimentacao> page = movimentacaoRepository.findAll(
                LivroCaixaMovimentacaoSpecs.filtrar(
                        tipo, status, categoriaId, contaId, clienteId, formaPagamento,
                        dataInicio, dataFim,
                        valorMin != null ? LivroCaixaSupport.reaisParaCentavos(valorMin) : null,
                        valorMax != null ? LivroCaixaSupport.reaisParaCentavos(valorMax) : null,
                        blankToNull(busca)),
                pageable);
        return page.map(movimentacaoMapper::toDto);
    }

    @Transactional(readOnly = true)
    public LivroCaixaMovimentacaoDetalheDTO detalhar(UUID usuarioId, UUID id) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findByIdDetalhado(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        return LivroCaixaMovimentacaoDetalheDTO.builder()
                .movimentacao(movimentacaoMapper.toDto(mov))
                .anexos(anexoRepository.findByMovimentacaoIdOrderByCriadoEmDesc(id).stream()
                        .map(a -> LivroCaixaAnexoResponseDTO.builder()
                                .id(a.getId())
                                .nomeOriginal(a.getNomeOriginal())
                                .tamanhoBytes(a.getTamanhoBytes())
                                .contentType(a.getContentType())
                                .enviadoPor(a.getEnviadoPor())
                                .criadoEm(a.getCriadoEm())
                                .build())
                        .collect(Collectors.toList()))
                .historico(historicoRepository.findByMovimentacaoIdOrderByCriadoEmDesc(id).stream()
                        .map(h -> LivroCaixaHistoricoResponseDTO.builder()
                                .id(h.getId())
                                .usuario(h.getUsuario())
                                .campo(h.getCampo())
                                .valorAnterior(h.getValorAnterior())
                                .valorNovo(h.getValorNovo())
                                .detalhes(h.getDetalhes())
                                .criadoEm(h.getCriadoEm())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    @Transactional
    public LivroCaixaMovimentacaoResponseDTO criar(UUID usuarioId, LivroCaixaMovimentacaoRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaSupport.validarStatusParaTipo(dto.getTipo(), dto.getStatus());
        LivroCaixaCategoria categoria = categoriaService.requireAtiva(dto.getCategoriaId());
        if (categoria.getTipo() != dto.getTipo()) {
            throw new BusinessRuleException("Categoria incompatível com o tipo da movimentação.");
        }
        String usuarioLogin = loginDoUsuario(usuarioId);
        LivroCaixaMovimentacao mov = montarMovimentacao(dto, categoria, usuarioLogin);
        mov.setOrigem(LivroCaixaOrigemMovimentacao.MANUAL);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("CRIAR", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Movimentação manual criada: " + mov.getDescricao());
        return movimentacaoMapper.toDto(mov);
    }

    @Transactional
    public LivroCaixaMovimentacaoResponseDTO atualizar(UUID usuarioId, UUID id, LivroCaixaMovimentacaoRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        if (!LivroCaixaSupport.isEditavel(mov)) {
            throw new BusinessRuleException("Movimentação automática deve ser alterada no módulo de origem.");
        }
        if (mov.isCancelado()) {
            throw new BusinessRuleException("Movimentação cancelada não pode ser editada.");
        }
        LivroCaixaSupport.validarStatusParaTipo(dto.getTipo(), dto.getStatus());
        LivroCaixaCategoria categoria = categoriaService.requireAtiva(dto.getCategoriaId());
        if (categoria.getTipo() != dto.getTipo()) {
            throw new BusinessRuleException("Categoria incompatível com o tipo da movimentação.");
        }
        String usuarioLogin = loginDoUsuario(usuarioId);
        registrarHistoricoSeMudou(mov, "status", mov.getStatus().name(), dto.getStatus().name(), usuarioLogin);
        registrarHistoricoSeMudou(mov, "valor",
                LivroCaixaSupport.centavosParaReais(mov.getValorCentavos()).toPlainString(),
                dto.getValor().toPlainString(), usuarioLogin);
        aplicarDto(mov, dto, categoria);
        mov.setAtualizadoPor(usuarioLogin);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("ATUALIZAR", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Movimentação atualizada.");
        return movimentacaoMapper.toDto(mov);
    }

    @Transactional
    public LivroCaixaMovimentacaoResponseDTO marcarComoRecebido(UUID usuarioId, UUID id, MarcarMovimentacaoRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        if (mov.getTipo() != LivroCaixaTipoMovimentacao.ENTRADA) {
            throw new BusinessRuleException("Somente entradas podem ser marcadas como recebidas.");
        }
        if (mov.getStatus() == LivroCaixaStatusMovimentacao.CANCELADO) {
            throw new BusinessRuleException("Movimentação cancelada.");
        }
        String usuarioLogin = loginDoUsuario(usuarioId);
        registrarHistoricoSeMudou(mov, "status", mov.getStatus().name(),
                LivroCaixaStatusMovimentacao.RECEBIDO.name(), usuarioLogin);
        mov.setStatus(LivroCaixaStatusMovimentacao.RECEBIDO);
        mov.setDataPagamento(dto.getDataPagamento());
        if (dto.getFormaPagamento() != null) {
            mov.setFormaPagamento(dto.getFormaPagamento());
        }
        if (dto.getContaId() != null) {
            mov.setConta(contaService.requireAtiva(dto.getContaId()));
        }
        mov.setAtualizadoPor(usuarioLogin);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("RECEBER", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Entrada marcada como recebida em " + dto.getDataPagamento());
        return movimentacaoMapper.toDto(mov);
    }

    @Transactional
    public LivroCaixaMovimentacaoResponseDTO marcarComoPago(UUID usuarioId, UUID id, MarcarMovimentacaoRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        if (mov.getTipo() != LivroCaixaTipoMovimentacao.SAIDA) {
            throw new BusinessRuleException("Somente saídas podem ser marcadas como pagas.");
        }
        if (mov.getStatus() == LivroCaixaStatusMovimentacao.CANCELADO) {
            throw new BusinessRuleException("Movimentação cancelada.");
        }
        String usuarioLogin = loginDoUsuario(usuarioId);
        registrarHistoricoSeMudou(mov, "status", mov.getStatus().name(),
                LivroCaixaStatusMovimentacao.PAGO.name(), usuarioLogin);
        mov.setStatus(LivroCaixaStatusMovimentacao.PAGO);
        mov.setDataPagamento(dto.getDataPagamento());
        if (dto.getFormaPagamento() != null) {
            mov.setFormaPagamento(dto.getFormaPagamento());
        }
        if (dto.getContaId() != null) {
            mov.setConta(contaService.requireAtiva(dto.getContaId()));
        }
        mov.setAtualizadoPor(usuarioLogin);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("PAGAR", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Saída marcada como paga em " + dto.getDataPagamento());
        return movimentacaoMapper.toDto(mov);
    }

    @Transactional
    public LivroCaixaMovimentacaoResponseDTO cancelar(UUID usuarioId, UUID id) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        if (mov.getOrigem() == LivroCaixaOrigemMovimentacao.INADIMPLENCIA) {
            throw new BusinessRuleException("Cancelamento de entrada automática deve ser feito no módulo de inadimplência.");
        }
        String usuarioLogin = loginDoUsuario(usuarioId);
        registrarHistoricoSeMudou(mov, "status", mov.getStatus().name(),
                LivroCaixaStatusMovimentacao.CANCELADO.name(), usuarioLogin);
        mov.setStatus(LivroCaixaStatusMovimentacao.CANCELADO);
        mov.setCanceladoEm(LocalDateTime.now(clock));
        mov.setAtualizadoPor(usuarioLogin);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("CANCELAR", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Movimentação cancelada.");
        return movimentacaoMapper.toDto(mov);
    }

    @Transactional
    public LivroCaixaMovimentacao criarAutomaticaInadimplencia(LivroCaixaMovimentacao mov) {
        if (mov.getOrigemId() != null
                && movimentacaoRepository.existsByOrigemAndOrigemId(mov.getOrigem(), mov.getOrigemId())) {
            return movimentacaoRepository.findByOrigemAndOrigemId(mov.getOrigem(), mov.getOrigemId()).orElse(mov);
        }
        LivroCaixaMovimentacao salva = movimentacaoRepository.save(mov);
        auditoriaService.registrarSistema("CRIAR_AUTO", "LIVRO_CAIXA_MOVIMENTACAO", salva.getId(),
                "Entrada automática por pagamento de inadimplência.");
        return salva;
    }

    private LivroCaixaMovimentacao montarMovimentacao(LivroCaixaMovimentacaoRequestDTO dto,
                                                      LivroCaixaCategoria categoria,
                                                      String usuarioLogin) {
        LivroCaixaMovimentacao mov = new LivroCaixaMovimentacao();
        aplicarDto(mov, dto, categoria);
        mov.setCriadoPor(usuarioLogin);
        mov.setAtualizadoPor(usuarioLogin);
        return mov;
    }

    private void aplicarDto(LivroCaixaMovimentacao mov,
                            LivroCaixaMovimentacaoRequestDTO dto,
                            LivroCaixaCategoria categoria) {
        mov.setTipo(dto.getTipo());
        mov.setDescricao(dto.getDescricao().trim());
        mov.setValorCentavos(LivroCaixaSupport.reaisParaCentavos(dto.getValor()));
        mov.setCategoria(categoria);
        mov.setDataMovimentacao(dto.getDataMovimentacao());
        mov.setDataVencimento(dto.getDataVencimento());
        mov.setDataPagamento(dto.getDataPagamento());
        mov.setStatus(dto.getStatus());
        // Realizados precisam de data de pagamento para bater com saldos/relatórios do mês.
        if ((dto.getStatus() == LivroCaixaStatusMovimentacao.RECEBIDO
                || dto.getStatus() == LivroCaixaStatusMovimentacao.PAGO)
                && mov.getDataPagamento() == null) {
            mov.setDataPagamento(dto.getDataMovimentacao() != null ? dto.getDataMovimentacao() : LocalDate.now(clock));
        }
        mov.setFormaPagamento(dto.getFormaPagamento());
        mov.setObservacao(dto.getObservacao());
        mov.setFornecedor(dto.getFornecedor());
        if (dto.getContaId() != null) {
            mov.setConta(contaService.requireAtiva(dto.getContaId()));
        } else {
            mov.setConta(null);
        }
        if (dto.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente", dto.getClienteId()));
            mov.setCliente(cliente);
        } else {
            mov.setCliente(null);
        }
    }

    private void registrarHistoricoSeMudou(LivroCaixaMovimentacao mov,
                                           String campo,
                                           String anterior,
                                           String novo,
                                           String usuario) {
        if (Objects.equals(anterior, novo)) {
            return;
        }
        historicoRepository.save(LivroCaixaHistorico.builder()
                .movimentacao(mov)
                .usuario(usuario)
                .campo(campo)
                .valorAnterior(anterior)
                .valorNovo(novo)
                .build());
    }

    private String loginDoUsuario(UUID usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(Usuario::getTelefone)
                .orElse(usuarioId.toString());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
