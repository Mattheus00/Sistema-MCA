package com.pucminas.sgi.service;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.dto.request.AtualizarClienteBoletoRequest;
import com.pucminas.sgi.dto.request.EnviarLoteRequest;
import com.pucminas.sgi.dto.response.CriarLoteEnvioResponse;
import com.pucminas.sgi.dto.response.EnviarLoteResponse;
import com.pucminas.sgi.dto.response.HistoricoLoteResponse;
import com.pucminas.sgi.dto.response.LoteEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.ResultadoEnvioItemResponse;
import com.pucminas.sgi.dto.response.ValidacaoLoteResponse;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import com.pucminas.sgi.util.EnvioBoletoUtil;
import com.pucminas.sgi.util.NomeArquivoUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import com.pucminas.sgi.validator.BoletoArquivoValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class LoteEnvioBoletoService {

    private static final Logger log = LoggerFactory.getLogger(LoteEnvioBoletoService.class);

    private final LoteEnvioBoletoRepository loteRepository;
    private final EnvioBoletoRepository envioBoletoRepository;
    private final ClienteRepository clienteRepository;
    private final EnvioBoletoAccessService accessService;
    private final ClienteIdentificacaoBoletoService identificacaoService;
    private final BoletoArquivoStorageService storageService;
    private final BoletoArquivoValidator arquivoValidator;
    private final EnvioBoletoEmailService emailService;
    private final AuditoriaService auditoriaService;
    private final LoteEnvioBoletoMapper mapper;
    private final BoletoEnvioProperties properties;

    private final Map<UUID, Object> locksPorLote = new ConcurrentHashMap<>();

    public LoteEnvioBoletoService(LoteEnvioBoletoRepository loteRepository,
                                  EnvioBoletoRepository envioBoletoRepository,
                                  ClienteRepository clienteRepository,
                                  EnvioBoletoAccessService accessService,
                                  ClienteIdentificacaoBoletoService identificacaoService,
                                  BoletoArquivoStorageService storageService,
                                  BoletoArquivoValidator arquivoValidator,
                                  EnvioBoletoEmailService emailService,
                                  AuditoriaService auditoriaService,
                                  LoteEnvioBoletoMapper mapper,
                                  BoletoEnvioProperties properties) {
        this.loteRepository = loteRepository;
        this.envioBoletoRepository = envioBoletoRepository;
        this.clienteRepository = clienteRepository;
        this.accessService = accessService;
        this.identificacaoService = identificacaoService;
        this.storageService = storageService;
        this.arquivoValidator = arquivoValidator;
        this.emailService = emailService;
        this.auditoriaService = auditoriaService;
        this.mapper = mapper;
        this.properties = properties;
    }

    @Transactional
    public CriarLoteEnvioResponse criarLote(UUID usuarioId, List<MultipartFile> arquivos) {
        Usuario usuario = accessService.assertPodeGerenciarBoletos(usuarioId);
        if (arquivos == null || arquivos.isEmpty()) {
            throw new BusinessRuleException("Informe ao menos um arquivo PDF.");
        }
        if (arquivos.size() > properties.getMaxFilesPerLote()) {
            throw new BusinessRuleException("Número máximo de arquivos por lote excedido: " + properties.getMaxFilesPerLote());
        }

        LoteEnvioBoleto lote = LoteEnvioBoleto.builder()
                .usuarioResponsavel(usuario)
                .status(StatusLoteEnvioBoleto.EM_ANALISE)
                .build();
        lote = loteRepository.save(lote);

        List<Cliente> cache = identificacaoService.carregarClientesAtivos();
        List<EnvioBoleto> itens = new ArrayList<>();

        for (MultipartFile arquivo : arquivos) {
            arquivoValidator.validar(arquivo);
            String nomeOriginal = BoletoArquivoValidator.sanitizarNomeExibicao(
                    NomeArquivoUtil.extrairNomeBase(arquivo.getOriginalFilename()));
            BoletoArquivoStorageService.ArquivoSalvo salvo = storageService.salvar(lote.getLoteId(), arquivo);

            ClienteIdentificacaoBoletoService.ResultadoIdentificacao id =
                    identificacaoService.identificar(nomeOriginal, cache);

            EnvioBoleto item = EnvioBoleto.builder()
                    .lote(lote)
                    .nomeArquivoOriginal(nomeOriginal)
                    .nomeArquivoArmazenado(salvo.nomeArmazenado())
                    .hashArquivo(salvo.hashSha256())
                    .contentType("application/pdf")
                    .tamanhoArquivo(salvo.tamanho())
                    .metodoIdentificacao(id.metodo())
                    .confiancaIdentificacao(id.confianca())
                    .build();

            aplicarIdentificacao(item, id.cliente());
            atualizarDuplicidade(item);
            recalcularStatusItem(item);
            item = envioBoletoRepository.save(item);
            itens.add(item);

            auditoriaService.registrarNaTransacaoAtual("BOLETO_ARQUIVO_ADICIONADO", "EnvioBoleto", item.getEnvioBoletoId(),
                    "arquivo=" + nomeOriginal);
            if (item.getCliente() != null) {
                auditoriaService.registrarNaTransacaoAtual("BOLETO_CLIENTE_IDENTIFICADO", "EnvioBoleto", null,
                        "clienteId=" + item.getCliente().getClienteId() + ",confianca=" + item.getConfiancaIdentificacao());
            }
        }

        lote.getItens().addAll(itens);
        lote.setQuantidadeTotal(itens.size());
        recalcularContadoresLote(lote);
        lote.setStatus(StatusLoteEnvioBoleto.AGUARDANDO_CONFERENCIA);
        lote = loteRepository.save(lote);

        auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_CRIADO", "LoteEnvioBoleto", lote.getLoteId(),
                "total=" + lote.getQuantidadeTotal());

        List<String> bloqueios = montarBloqueiosItens(lote.getItens());
        return CriarLoteEnvioResponse.builder()
                .loteId(lote.getLoteId())
                .lote(mapper.toLoteResponse(lote, bloqueios))
                .build();
    }

    @Transactional
    public LoteEnvioBoletoResponse consultarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        atualizarStatusItensDoLote(lote);
        return mapper.toLoteResponse(lote, montarBloqueiosItens(lote.getItens()));
    }

    @Transactional(readOnly = true)
    public Page<HistoricoLoteResponse> listarHistorico(UUID usuarioId, StatusLoteEnvioBoleto status,
                                                       UUID filtroUsuarioId, UUID clienteId,
                                                       LocalDate dataInicio, LocalDate dataFim,
                                                       String email, String nomeArquivo,
                                                       Pageable pageable) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LocalDateTime inicio = dataInicio != null ? dataInicio.atStartOfDay() : null;
        LocalDateTime fim = dataFim != null ? dataFim.atTime(LocalTime.MAX) : null;
        String emailLike = (email != null && !email.isBlank()) ? "%" + email.trim().toLowerCase() + "%" : null;
        String nomeArquivoLike = (nomeArquivo != null && !nomeArquivo.isBlank())
                ? "%" + nomeArquivo.trim().toLowerCase() + "%"
                : null;
        return loteRepository.buscarHistorico(
                        status, filtroUsuarioId, clienteId, inicio, fim, emailLike, nomeArquivoLike, pageable)
                .map(mapper::toHistorico);
    }

    @Transactional
    public LoteEnvioBoletoResponse atualizarCliente(UUID usuarioId, UUID loteId, UUID itemId,
                                                    AtualizarClienteBoletoRequest request) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);

        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", request.getClienteId()));

        item.setCliente(cliente);
        item.setMetodoIdentificacao(MetodoIdentificacaoBoleto.MANUAL);
        item.setConfiancaIdentificacao(ConfiancaIdentificacaoBoleto.ALTA);
        item.setConfirmadoPeloUsuario(true);
        item.setEmailDestinatario(TelefoneClienteUtil.normalizarEmailOpcional(cliente.getEmail()));
        atualizarDuplicidade(item);
        recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        recalcularContadoresLote(lote);
        loteRepository.save(lote);

        auditoriaService.registrarNaTransacaoAtual("BOLETO_CLIENTE_ALTERADO_MANUAL", "EnvioBoleto", itemId,
                "clienteId=" + cliente.getClienteId());
        return mapper.toLoteResponse(lote, montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse confirmarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        if (item.getConfiancaIdentificacao() != ConfiancaIdentificacaoBoleto.BAIXA) {
            throw new BusinessRuleException("Confirmação explícita só é necessária para itens com confiança BAIXA.");
        }
        if (item.getCliente() == null) {
            throw new BusinessRuleException("Associe um cliente antes de confirmar.");
        }
        item.setConfirmadoPeloUsuario(true);
        recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        recalcularContadoresLote(lote);
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("BOLETO_ITEM_CONFIRMADO", "EnvioBoleto", itemId, null);
        return mapper.toLoteResponse(lote, montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse ignorarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        item.setStatus(StatusEnvioBoleto.IGNORADO);
        envioBoletoRepository.save(item);
        recalcularContadoresLote(lote);
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("BOLETO_ITEM_IGNORADO", "EnvioBoleto", itemId, null);
        return mapper.toLoteResponse(lote, montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse reativarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        if (item.getStatus() != StatusEnvioBoleto.IGNORADO) {
            throw new BusinessRuleException("Somente itens ignorados podem ser reativados.");
        }
        item.setStatus(StatusEnvioBoleto.PENDENTE_ANALISE);
        recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        recalcularContadoresLote(lote);
        loteRepository.save(lote);
        return mapper.toLoteResponse(lote, montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public ValidacaoLoteResponse validarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        atualizarStatusItensDoLote(lote);
        List<String> bloqueiosItens = montarBloqueiosItens(lote.getItens());
        List<String> bloqueiosGerais = new ArrayList<>();
        boolean podeEnviar = bloqueiosItens.stream().allMatch(b -> b == null || b.isBlank());
        if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
            bloqueiosGerais.add("Lote em processamento.");
            podeEnviar = false;
        }
        if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
            bloqueiosGerais.add("Lote cancelado.");
            podeEnviar = false;
        }
        List<com.pucminas.sgi.dto.response.ItemEnvioBoletoResponse> itensResp = new ArrayList<>();
        for (int i = 0; i < lote.getItens().size(); i++) {
            itensResp.add(mapper.toItemResponse(lote.getItens().get(i), parseBloqueios(bloqueiosItens.get(i))));
        }
        return ValidacaoLoteResponse.builder()
                .loteId(loteId)
                .podeEnviar(podeEnviar)
                .resumo(mapper.calcularResumo(lote.getItens()))
                .itens(itensResp)
                .bloqueiosGerais(bloqueiosGerais)
                .build();
    }

    @Transactional
    public EnviarLoteResponse enviarLote(UUID usuarioId, UUID loteId, EnviarLoteRequest request) {
        Usuario usuario = accessService.assertPodeGerenciarBoletos(usuarioId);
        Object lock = locksPorLote.computeIfAbsent(loteId, k -> new Object());
        synchronized (lock) {
            LoteEnvioBoleto lote = buscarLoteComItens(loteId);
            if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
                throw new BusinessRuleException("Lote já está em processamento.");
            }
            if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
                throw new BusinessRuleException("Lote cancelado.");
            }

            atualizarStatusItensDoLote(lote);

            boolean permitirDuplicado = request != null && Boolean.TRUE.equals(request.getPermitirReenvioDuplicado());
            List<UUID> itemIdsFiltro = filtrarItemIdsExistentesNoLote(
                    lote, normalizarItemIds(request != null ? request.getItemIds() : null));

            List<EnvioBoleto> candidatos = filtrarCandidatosEnvio(lote.getItens(), itemIdsFiltro);

            if (candidatos.isEmpty()) {
                long prontosNoLote = lote.getItens().stream()
                        .filter(i -> i.getStatus() == StatusEnvioBoleto.PRONTO_PARA_ENVIO
                                || i.getStatus() == StatusEnvioBoleto.ERRO)
                        .count();
                if (itemIdsFiltro != null && !itemIdsFiltro.isEmpty() && prontosNoLote > 0) {
                    String nomes = lote.getItens().stream()
                            .filter(i -> itemIdsFiltro.contains(i.getEnvioBoletoId()))
                            .map(EnvioBoleto::getNomeArquivoOriginal)
                            .collect(Collectors.joining(", "));
                    throw new BusinessRuleException(
                            "Itens selecionados não estão prontos para envio"
                                    + (nomes.isBlank() ? "." : ": " + nomes + "."));
                }
                throw new BusinessRuleException("Nenhum item pronto para envio.");
            }

            for (EnvioBoleto item : candidatos) {
                List<String> bloqueios = calcularBloqueiosItem(item, permitirDuplicado);
                if (!bloqueios.isEmpty()) {
                    throw new BusinessRuleException("Item bloqueado: " + item.getNomeArquivoOriginal()
                            + " — " + String.join("; ", bloqueios));
                }
            }

            lote.setStatus(StatusLoteEnvioBoleto.PROCESSANDO);
            lote.setDataConfirmacao(LocalDateTime.now());
            loteRepository.save(lote);
            auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_ENVIO_INICIADO", "LoteEnvioBoleto", loteId,
                    "itens=" + candidatos.size());

            List<ResultadoEnvioItemResponse> resultados = new ArrayList<>();
            int enviados = 0;
            int erros = 0;

            for (EnvioBoleto item : candidatos) {
                boolean eraErro = item.getStatus() == StatusEnvioBoleto.ERRO;
                item.setStatus(StatusEnvioBoleto.ENVIANDO);
                item.setQuantidadeTentativas(item.getQuantidadeTentativas() + 1);
                envioBoletoRepository.save(item);

                try {
                    byte[] pdf = storageService.ler(loteId, item.getNomeArquivoArmazenado());
                    emailService.enviarBoleto(item, pdf);
                    item.setStatus(StatusEnvioBoleto.ENVIADO);
                    item.setDataEnvio(LocalDateTime.now());
                    item.setMensagemErro(null);
                    item.setEnviadoPor(usuario);
                    if (eraErro || Boolean.TRUE.equals(item.getReenvio())) {
                        item.setReenvio(true);
                    }
                    enviados++;
                    auditoriaService.registrarNaTransacaoAtual(
                            Boolean.TRUE.equals(item.getReenvio()) ? "BOLETO_REENVIO" : "BOLETO_ENVIADO",
                            "EnvioBoleto", item.getEnvioBoletoId(),
                            "simulado=" + item.getSimulado());
                } catch (EmailSendException | BusinessRuleException e) {
                    item.setStatus(StatusEnvioBoleto.ERRO);
                    item.setMensagemErro(e.getMessage());
                    erros++;
                    auditoriaService.registrarNaTransacaoAtual("BOLETO_ENVIO_ERRO", "EnvioBoleto", item.getEnvioBoletoId(),
                            e.getMessage());
                    log.warn("Falha ao enviar boleto {}: {}", item.getEnvioBoletoId(), e.getMessage());
                } catch (Exception e) {
                    item.setStatus(StatusEnvioBoleto.ERRO);
                    item.setMensagemErro("Falha inesperada no envio.");
                    erros++;
                    log.error("Erro inesperado ao enviar boleto {}", item.getEnvioBoletoId(), e);
                }
                envioBoletoRepository.save(item);
                resultados.add(mapper.toResultado(item));
            }

            recalcularContadoresLote(lote);
            lote.setDataFinalizacao(LocalDateTime.now());
            if (erros > 0 && enviados > 0) {
                lote.setStatus(StatusLoteEnvioBoleto.CONCLUIDO_COM_ERROS);
            } else if (erros > 0) {
                lote.setStatus(StatusLoteEnvioBoleto.CONCLUIDO_COM_ERROS);
            } else {
                lote.setStatus(StatusLoteEnvioBoleto.CONCLUIDO);
            }
            loteRepository.save(lote);
            auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_ENVIO_CONCLUIDO", "LoteEnvioBoleto", loteId,
                    "enviados=" + enviados + ",erros=" + erros);

            return EnviarLoteResponse.builder()
                    .loteId(loteId)
                    .statusLote(lote.getStatus().name())
                    .totalProcessados(candidatos.size())
                    .enviados(enviados)
                    .erros(erros)
                    .ignorados((int) lote.getItens().stream().filter(i -> i.getStatus() == StatusEnvioBoleto.IGNORADO).count())
                    .resultados(resultados)
                    .build();
        }
    }

    @Transactional
    public void cancelarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
            throw new BusinessRuleException("Não é possível cancelar lote em processamento.");
        }
        lote.setStatus(StatusLoteEnvioBoleto.CANCELADO);
        lote.getItens().forEach(i -> {
            if (i.getStatus() != StatusEnvioBoleto.ENVIADO) {
                i.setStatus(StatusEnvioBoleto.CANCELADO);
            }
        });
        loteRepository.save(lote);
        storageService.removerLote(loteId);
        auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_CANCELADO", "LoteEnvioBoleto", loteId, null);
    }

    @Transactional(readOnly = true)
    public EnvioBoleto buscarItemParaDownload(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        return buscarItem(lote, itemId);
    }

    @Transactional(readOnly = true)
    public String gerarCsvRelatorio(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        StringBuilder sb = new StringBuilder();
        sb.append("cliente;email;arquivo;status;data_envio;mensagem_erro;simulado\n");
        for (EnvioBoleto item : lote.getItens()) {
            sb.append(csv(item.getCliente() != null ? item.getCliente().getNome() : ""))
                    .append(';')
                    .append(csv(item.getEmailDestinatario()))
                    .append(';')
                    .append(csv(item.getNomeArquivoOriginal()))
                    .append(';')
                    .append(item.getStatus())
                    .append(';')
                    .append(item.getDataEnvio() != null ? item.getDataEnvio() : "")
                    .append(';')
                    .append(csv(item.getMensagemErro()))
                    .append(';')
                    .append(item.getSimulado())
                    .append('\n');
        }
        return sb.toString();
    }

    private LoteEnvioBoleto buscarLoteComItens(UUID loteId) {
        LoteEnvioBoleto lote = loteRepository.findById(loteId)
                .orElseThrow(() -> new ResourceNotFoundException("LoteEnvioBoleto", loteId));
        lote.getItens().size();
        return lote;
    }

    private EnvioBoleto buscarItem(LoteEnvioBoleto lote, UUID itemId) {
        return lote.getItens().stream()
                .filter(i -> i.getEnvioBoletoId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("EnvioBoleto", itemId));
    }

    private void assertLoteEditavel(LoteEnvioBoleto lote) {
        if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
            throw new BusinessRuleException("Lote em processamento.");
        }
        if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
            throw new BusinessRuleException("Lote cancelado.");
        }
    }

    private void aplicarIdentificacao(EnvioBoleto item, Cliente cliente) {
        if (cliente == null) {
            item.setCliente(null);
            item.setEmailDestinatario(null);
            return;
        }
        item.setCliente(cliente);
        item.setEmailDestinatario(TelefoneClienteUtil.normalizarEmailOpcional(cliente.getEmail()));
    }

    private void atualizarDuplicidade(EnvioBoleto item) {
        if (item.getCliente() == null) {
            item.setPossivelDuplicidade(false);
            return;
        }
        boolean dup;
        if (item.getEnvioBoletoId() == null) {
            dup = envioBoletoRepository.existsByHashArquivoAndCliente_ClienteIdAndStatus(
                    item.getHashArquivo(),
                    item.getCliente().getClienteId(),
                    StatusEnvioBoleto.ENVIADO);
        } else {
            dup = envioBoletoRepository.existsByHashArquivoAndCliente_ClienteIdAndStatusAndEnvioBoletoIdNot(
                    item.getHashArquivo(),
                    item.getCliente().getClienteId(),
                    StatusEnvioBoleto.ENVIADO,
                    item.getEnvioBoletoId());
        }
        item.setPossivelDuplicidade(dup);
    }

    private void recalcularStatusItem(EnvioBoleto item) {
        if (item.getStatus() == StatusEnvioBoleto.IGNORADO
                || item.getStatus() == StatusEnvioBoleto.ENVIADO
                || item.getStatus() == StatusEnvioBoleto.CANCELADO) {
            return;
        }
        EnvioBoletoUtil.sincronizarEmailDoCliente(item);
        if (item.getCliente() == null
                || item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.BAIXA
                && !Boolean.TRUE.equals(item.getConfirmadoPeloUsuario())) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (EnvioBoletoUtil.resolverEmailDestinatario(item) == null) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (item.getCliente().getStatusCliente() == StatusCliente.INATIVO) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        item.setStatus(StatusEnvioBoleto.PRONTO_PARA_ENVIO);
    }

    private void recalcularContadoresLote(LoteEnvioBoleto lote) {
        List<EnvioBoleto> itens = lote.getItens();
        lote.setQuantidadeTotal(itens.size());
        lote.setQuantidadeIdentificada((int) itens.stream().filter(i -> i.getCliente() != null).count());
        lote.setQuantidadePendente((int) itens.stream()
                .filter(i -> i.getStatus() == StatusEnvioBoleto.AGUARDANDO_CORRECAO
                        || i.getStatus() == StatusEnvioBoleto.PENDENTE_ANALISE)
                .count());
        lote.setQuantidadeEnviada((int) itens.stream().filter(i -> i.getStatus() == StatusEnvioBoleto.ENVIADO).count());
        lote.setQuantidadeComErro((int) itens.stream().filter(i -> i.getStatus() == StatusEnvioBoleto.ERRO).count());
    }

    private List<String> montarBloqueiosItens(List<EnvioBoleto> itens) {
        List<String> result = new ArrayList<>();
        for (EnvioBoleto item : itens) {
            result.add(String.join("|", calcularBloqueiosItem(item, false)));
        }
        return result;
    }

    private List<String> calcularBloqueiosItem(EnvioBoleto item, boolean permitirDuplicado) {
        if (item.getStatus() == StatusEnvioBoleto.IGNORADO) {
            return List.of();
        }
        List<String> bloqueios = new ArrayList<>();
        if (item.getCliente() == null) {
            bloqueios.add("Cliente não identificado.");
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO) {
            bloqueios.add("Confiança não identificada — corrija manualmente.");
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.BAIXA
                && !Boolean.TRUE.equals(item.getConfirmadoPeloUsuario())) {
            bloqueios.add("Confiança baixa — confirme ou corrija o cliente.");
        }
        if (EnvioBoletoUtil.resolverEmailDestinatario(item) == null) {
            bloqueios.add("Cliente sem e-mail válido.");
        }
        if (item.getCliente() != null && item.getCliente().getStatusCliente() == StatusCliente.INATIVO) {
            bloqueios.add("Cliente inativo.");
        }
        if (Boolean.TRUE.equals(item.getPossivelDuplicidade()) && !permitirDuplicado) {
            bloqueios.add("Possível duplicidade — boleto já enviado para este cliente.");
        }
        if (item.getStatus() != StatusEnvioBoleto.PRONTO_PARA_ENVIO && item.getStatus() != StatusEnvioBoleto.ERRO) {
            bloqueios.add("Item não está pronto para envio.");
        }
        return bloqueios;
    }

    private void atualizarStatusItensDoLote(LoteEnvioBoleto lote) {
        boolean alterado = false;
        for (EnvioBoleto item : lote.getItens()) {
            if (item.getStatus() == StatusEnvioBoleto.IGNORADO
                    || item.getStatus() == StatusEnvioBoleto.ENVIADO
                    || item.getStatus() == StatusEnvioBoleto.CANCELADO
                    || item.getStatus() == StatusEnvioBoleto.ENVIANDO) {
                continue;
            }
            StatusEnvioBoleto antes = item.getStatus();
            String emailAntes = item.getEmailDestinatario();
            EnvioBoletoUtil.sincronizarEmailDoCliente(item);
            recalcularStatusItem(item);
            if (item.getStatus() != antes || !java.util.Objects.equals(emailAntes, item.getEmailDestinatario())) {
                envioBoletoRepository.save(item);
                alterado = true;
            }
        }
        if (alterado) {
            recalcularContadoresLote(lote);
            loteRepository.save(lote);
        }
    }

    /**
     * Se o frontend enviar IDs inválidos (ex.: clienteId ou índice), ignora a seleção
     * e permite enviar todos os itens prontos do lote.
     */
    private List<UUID> filtrarItemIdsExistentesNoLote(LoteEnvioBoleto lote, List<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return itemIds;
        }
        List<UUID> idsDoLote = lote.getItens().stream().map(EnvioBoleto::getEnvioBoletoId).toList();
        List<UUID> validos = itemIds.stream().filter(idsDoLote::contains).toList();
        if (validos.isEmpty()) {
            log.warn("Nenhum itemId da requisição pertence ao lote {} — enviando todos os prontos.", lote.getLoteId());
            return null;
        }
        return validos;
    }

    private static List<UUID> normalizarItemIds(List<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return itemIds;
        }
        return itemIds.stream().filter(id -> id != null).distinct().toList();
    }

    private static List<EnvioBoleto> filtrarCandidatosEnvio(List<EnvioBoleto> itens, List<UUID> itemIds) {
        return itens.stream()
                .filter(i -> itemIds == null || itemIds.isEmpty() || itemIds.contains(i.getEnvioBoletoId()))
                .filter(i -> i.getStatus() == StatusEnvioBoleto.PRONTO_PARA_ENVIO
                        || i.getStatus() == StatusEnvioBoleto.ERRO)
                .collect(Collectors.toList());
    }

    private List<String> parseBloqueios(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return List.of(joined.split("\\|"));
    }

    private static String csv(String valor) {
        if (valor == null) {
            return "";
        }
        String v = valor.replace("\"", "\"\"");
        if (v.contains(";") || v.contains("\"") || v.contains("\n")) {
            return "\"" + v + "\"";
        }
        return v;
    }
}
