package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.LivroCaixaMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.request.MarcarMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.entity.*;
import com.pucminas.sgi.enums.*;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LivroCaixaMovimentacaoService {

    private static final List<LivroCaixaStatusMovimentacao> STATUS_ENTRADA_REALIZADO =
            List.of(LivroCaixaStatusMovimentacao.RECEBIDO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_SAIDA_REALIZADO =
            List.of(LivroCaixaStatusMovimentacao.PAGO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_ENTRADA_MES =
            List.of(LivroCaixaStatusMovimentacao.RECEBIDO, LivroCaixaStatusMovimentacao.PREVISTO);
    private static final List<LivroCaixaStatusMovimentacao> STATUS_SAIDA_MES =
            List.of(LivroCaixaStatusMovimentacao.PAGO, LivroCaixaStatusMovimentacao.PREVISTO);

    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final LivroCaixaHistoricoRepository historicoRepository;
    private final LivroCaixaAnexoRepository anexoRepository;
    private final LivroCaixaCategoriaService categoriaService;
    private final ContaFinanceiraService contaService;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final StaffAccessService staffAccessService;
    private final AuditoriaService auditoriaService;

    public LivroCaixaMovimentacaoService(LivroCaixaMovimentacaoRepository movimentacaoRepository,
                                         LivroCaixaHistoricoRepository historicoRepository,
                                         LivroCaixaAnexoRepository anexoRepository,
                                         LivroCaixaCategoriaService categoriaService,
                                         ContaFinanceiraService contaService,
                                         ClienteRepository clienteRepository,
                                         UsuarioRepository usuarioRepository,
                                         StaffAccessService staffAccessService,
                                         AuditoriaService auditoriaService) {
        this.movimentacaoRepository = movimentacaoRepository;
        this.historicoRepository = historicoRepository;
        this.anexoRepository = anexoRepository;
        this.categoriaService = categoriaService;
        this.contaService = contaService;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.staffAccessService = staffAccessService;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public LivroCaixaDashboardDTO dashboard(UUID usuarioId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate hoje = LocalDate.now();
        YearMonth mesAtual = YearMonth.from(hoje);
        LocalDate inicioMes = mesAtual.atDay(1);
        LocalDate fimMes = mesAtual.atEndOfMonth();

        BigDecimal entradasRealizadas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.ENTRADA, STATUS_ENTRADA_REALIZADO);
        BigDecimal saidasRealizadas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.SAIDA, STATUS_SAIDA_REALIZADO);
        BigDecimal entradasPrevistas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.ENTRADA, List.of(LivroCaixaStatusMovimentacao.PREVISTO));
        BigDecimal saidasPrevistas = movimentacaoRepository.somarPorTipoEStatus(
                LivroCaixaTipoMovimentacao.SAIDA, List.of(LivroCaixaStatusMovimentacao.PREVISTO));

        BigDecimal saldoRealizadoCentavos = entradasRealizadas.subtract(saidasRealizadas);
        BigDecimal saldoPrevistoCentavos = saldoRealizadoCentavos.add(entradasPrevistas).subtract(saidasPrevistas);

        BigDecimal entradasMesCentavos = movimentacaoRepository.somarNoPeriodoPorDataEfetiva(
                LivroCaixaTipoMovimentacao.ENTRADA, STATUS_ENTRADA_MES, inicioMes, fimMes);
        BigDecimal saidasMesCentavos = movimentacaoRepository.somarNoPeriodoPorDataEfetiva(
                LivroCaixaTipoMovimentacao.SAIDA, STATUS_SAIDA_MES, inicioMes, fimMes);

        return LivroCaixaDashboardDTO.builder()
                .saldoRealizado(LivroCaixaSupport.centavosParaReais(saldoRealizadoCentavos))
                .saldoPrevisto(LivroCaixaSupport.centavosParaReais(saldoPrevistoCentavos))
                .entradasMes(LivroCaixaSupport.centavosParaReais(entradasMesCentavos))
                .saidasMes(LivroCaixaSupport.centavosParaReais(saidasMesCentavos))
                .resultadoMes(LivroCaixaSupport.centavosParaReais(entradasMesCentavos.subtract(saidasMesCentavos)))
                .build();
    }

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
        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public LivroCaixaMovimentacaoDetalheDTO detalhar(UUID usuarioId, UUID id) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findByIdDetalhado(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", id));
        return LivroCaixaMovimentacaoDetalheDTO.builder()
                .movimentacao(toDto(mov))
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
        return toDto(mov);
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
        return toDto(mov);
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
        return toDto(mov);
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
        return toDto(mov);
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
        mov.setCanceladoEm(java.time.LocalDateTime.now());
        mov.setAtualizadoPor(usuarioLogin);
        mov = movimentacaoRepository.save(mov);
        auditoriaService.registrarNaTransacaoAtual("CANCELAR", "LIVRO_CAIXA_MOVIMENTACAO", mov.getId(),
                "Movimentação cancelada.");
        return toDto(mov);
    }

    @Transactional(readOnly = true)
    public LivroCaixaAnaliseDTO analise(UUID usuarioId, LocalDate dataInicio, LocalDate dataFim) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate inicio = dataInicio != null ? dataInicio : LocalDate.now().minusMonths(5).withDayOfMonth(1);
        LocalDate fim = dataFim != null ? dataFim : LocalDate.now();

        List<LivroCaixaMovimentacao> realizadas = movimentacaoRepository.listarRealizadasNoPeriodo(
                List.of(LivroCaixaStatusMovimentacao.RECEBIDO, LivroCaixaStatusMovimentacao.PAGO),
                inicio, fim);

        Map<YearMonth, BigDecimal[]> porMes = new TreeMap<>();
        for (LivroCaixaMovimentacao mov : realizadas) {
            if (mov.getDataPagamento() == null) {
                continue;
            }
            YearMonth ym = YearMonth.from(mov.getDataPagamento());
            BigDecimal[] acc = porMes.computeIfAbsent(ym, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            if (mov.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA) {
                acc[0] = acc[0].add(mov.getValorCentavos());
            } else {
                acc[1] = acc[1].add(mov.getValorCentavos());
            }
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        List<LivroCaixaGraficoMensalItemDTO> mensal = porMes.entrySet().stream()
                .map(e -> {
                    BigDecimal ent = e.getValue()[0];
                    BigDecimal sai = e.getValue()[1];
                    return LivroCaixaGraficoMensalItemDTO.builder()
                            .periodo(e.getKey().format(fmt))
                            .entradas(LivroCaixaSupport.centavosParaReais(ent))
                            .saidas(LivroCaixaSupport.centavosParaReais(sai))
                            .resultado(LivroCaixaSupport.centavosParaReais(ent.subtract(sai)))
                            .build();
                })
                .collect(Collectors.toList());

        List<Object[]> categorias = movimentacaoRepository.somarSaidasPorCategoria(
                LivroCaixaTipoMovimentacao.SAIDA,
                LivroCaixaStatusMovimentacao.PAGO,
                inicio, fim);
        BigDecimal totalSaidas = categorias.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LivroCaixaGraficoCategoriaItemDTO> porCategoria = categorias.stream()
                .map(row -> {
                    BigDecimal valor = (BigDecimal) row[1];
                    BigDecimal pct = totalSaidas.compareTo(BigDecimal.ZERO) == 0
                            ? BigDecimal.ZERO
                            : valor.multiply(BigDecimal.valueOf(100))
                            .divide(totalSaidas, 2, RoundingMode.HALF_UP);
                    return LivroCaixaGraficoCategoriaItemDTO.builder()
                            .categoria((String) row[0])
                            .valor(LivroCaixaSupport.centavosParaReais(valor))
                            .percentual(pct)
                            .build();
                })
                .collect(Collectors.toList());

        BigDecimal saldoAcumulado = BigDecimal.ZERO;
        List<LivroCaixaFluxoCaixaItemDTO> fluxo = new ArrayList<>();
        for (Map.Entry<YearMonth, BigDecimal[]> entry : porMes.entrySet()) {
            BigDecimal ent = entry.getValue()[0];
            BigDecimal sai = entry.getValue()[1];
            BigDecimal saldoInicial = saldoAcumulado;
            saldoAcumulado = saldoAcumulado.add(ent).subtract(sai);
            fluxo.add(LivroCaixaFluxoCaixaItemDTO.builder()
                    .periodo(entry.getKey().format(fmt))
                    .saldoInicial(LivroCaixaSupport.centavosParaReais(saldoInicial))
                    .entradas(LivroCaixaSupport.centavosParaReais(ent))
                    .saidas(LivroCaixaSupport.centavosParaReais(sai))
                    .saldoFinal(LivroCaixaSupport.centavosParaReais(saldoAcumulado))
                    .build());
        }

        return LivroCaixaAnaliseDTO.builder()
                .entradasSaidasMensais(mensal)
                .despesasPorCategoria(porCategoria)
                .fluxoCaixa(fluxo)
                .build();
    }

    @Transactional(readOnly = true)
    public LivroCaixaRelatorioDTO relatorio(UUID usuarioId,
                                            LocalDate dataInicio,
                                            LocalDate dataFim,
                                            LivroCaixaTipoMovimentacao tipo,
                                            LivroCaixaStatusMovimentacao status,
                                            UUID categoriaId,
                                            UUID contaId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LocalDate inicio = dataInicio != null ? dataInicio : YearMonth.now().atDay(1);
        LocalDate fim = dataFim != null ? dataFim : LocalDate.now();

        Page<LivroCaixaMovimentacao> page = movimentacaoRepository.findAll(
                LivroCaixaMovimentacaoSpecs.filtrar(
                        tipo, status, categoriaId, contaId, null, null,
                        inicio, fim, null, null, null),
                Pageable.unpaged());

        BigDecimal entradas = BigDecimal.ZERO;
        BigDecimal saidas = BigDecimal.ZERO;
        List<LivroCaixaMovimentacaoResponseDTO> itens = new ArrayList<>();
        for (LivroCaixaMovimentacao mov : page.getContent()) {
            if (LivroCaixaSupport.isRealizado(mov)) {
                if (mov.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA) {
                    entradas = entradas.add(mov.getValorCentavos());
                } else {
                    saidas = saidas.add(mov.getValorCentavos());
                }
            }
            itens.add(toDto(mov));
        }

        BigDecimal saldoFinal = entradas.subtract(saidas);
        return LivroCaixaRelatorioDTO.builder()
                .periodoDescricao(inicio + " a " + fim)
                .saldoInicial(BigDecimal.ZERO)
                .totalEntradas(LivroCaixaSupport.centavosParaReais(entradas))
                .totalSaidas(LivroCaixaSupport.centavosParaReais(saidas))
                .saldoFinal(LivroCaixaSupport.centavosParaReais(saldoFinal))
                .movimentacoes(itens)
                .build();
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
            mov.setDataPagamento(dto.getDataMovimentacao() != null ? dto.getDataMovimentacao() : LocalDate.now());
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

    private LivroCaixaMovimentacaoResponseDTO toDto(LivroCaixaMovimentacao mov) {
        return LivroCaixaMovimentacaoResponseDTO.builder()
                .id(mov.getId())
                .tipo(mov.getTipo())
                .descricao(mov.getDescricao())
                .valor(LivroCaixaSupport.centavosParaReais(mov.getValorCentavos()))
                .categoriaId(mov.getCategoriaId())
                .categoriaNome(mov.getCategoria() != null ? mov.getCategoria().getNome() : null)
                .clienteId(mov.getClienteId())
                .clienteNome(mov.getCliente() != null ? mov.getCliente().getNome() : null)
                .dataMovimentacao(mov.getDataMovimentacao())
                .dataVencimento(mov.getDataVencimento())
                .dataPagamento(mov.getDataPagamento())
                .status(mov.getStatus())
                .formaPagamento(mov.getFormaPagamento())
                .contaId(mov.getContaId())
                .contaNome(mov.getConta() != null ? mov.getConta().getNome() : null)
                .observacao(mov.getObservacao())
                .fornecedor(mov.getFornecedor())
                .origem(mov.getOrigem())
                .origemId(mov.getOrigemId())
                .editavel(LivroCaixaSupport.isEditavel(mov))
                .vencido(LivroCaixaSupport.isVencido(mov))
                .proximoVencimento(LivroCaixaSupport.isProximoVencimento(mov))
                .criadoPor(mov.getCriadoPor())
                .atualizadoPor(mov.getAtualizadoPor())
                .criadoEm(mov.getCriadoEm())
                .atualizadoEm(mov.getAtualizadoEm())
                .canceladoEm(mov.getCanceladoEm())
                .build();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
