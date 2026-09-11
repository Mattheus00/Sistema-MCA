package com.pucminas.sgi.service;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.dto.request.AtualizarClienteBoletoRequest;
import com.pucminas.sgi.dto.request.EnviarLoteRequest;
import com.pucminas.sgi.dto.response.CriarLoteEnvioResponse;
import com.pucminas.sgi.dto.response.EnviarLoteResponse;
import com.pucminas.sgi.dto.response.HistoricoLoteResponse;
import com.pucminas.sgi.dto.response.LoteEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.ResultadoEnvioLoteResponse;
import com.pucminas.sgi.dto.response.ValidacaoLoteResponse;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import com.pucminas.sgi.security.EnvioBoletoAccessService;
import com.pucminas.sgi.util.NomeArquivoUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import lombok.RequiredArgsConstructor;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoteEnvioBoletoService {

    private final LoteEnvioBoletoRepository loteRepository;
    private final EnvioBoletoRepository envioBoletoRepository;
    private final ClienteRepository clienteRepository;
    private final EnvioBoletoAccessService accessService;
    private final ClienteIdentificacaoBoletoService identificacaoService;
    private final BoletoArquivoStorageService storageService;
    private final BoletoArquivoValidator arquivoValidator;
    private final AuditoriaService auditoriaService;
    private final LoteEnvioBoletoMapper mapper;
    private final BoletoEnvioProperties properties;
    private final LoteEnvioBoletoValidacaoService validacaoService;
    private final LoteEnvioBoletoRelatorioService relatorioService;
    private final LoteEnvioBoletoEnvioService envioService;

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

            validacaoService.aplicarIdentificacao(item, id.cliente());
            validacaoService.atualizarDuplicidade(item);
            validacaoService.recalcularStatusItem(item);
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
        validacaoService.recalcularContadoresLote(lote);
        lote.setStatus(StatusLoteEnvioBoleto.AGUARDANDO_CONFERENCIA);
        lote = loteRepository.save(lote);

        auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_CRIADO", "LoteEnvioBoleto", lote.getLoteId(),
                "total=" + lote.getQuantidadeTotal());

        return CriarLoteEnvioResponse.builder()
                .loteId(lote.getLoteId())
                .lote(mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens())))
                .build();
    }

    @Transactional
    public LoteEnvioBoletoResponse consultarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        validacaoService.atualizarStatusItensDoLote(lote);
        return mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens()));
    }

    @Transactional(readOnly = true)
    public ResultadoEnvioLoteResponse consultarResultadoEnvio(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        return mapper.toResultadoEnvio(buscarLoteComItens(loteId));
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
        boolean filtrarEmail = email != null && !email.isBlank();
        boolean filtrarNomeArquivo = nomeArquivo != null && !nomeArquivo.isBlank();
        String emailLike = filtrarEmail ? "%" + email.trim().toLowerCase() + "%" : "";
        String nomeArquivoLike = filtrarNomeArquivo ? "%" + nomeArquivo.trim().toLowerCase() + "%" : "";
        return loteRepository.buscarHistorico(
                        status, status != null,
                        filtroUsuarioId, filtroUsuarioId != null,
                        clienteId, clienteId != null,
                        inicio, dataInicio != null,
                        fim, dataFim != null,
                        emailLike, filtrarEmail,
                        nomeArquivoLike, filtrarNomeArquivo,
                        pageable)
                .map(mapper::toHistorico);
    }

    @Transactional
    public LoteEnvioBoletoResponse atualizarCliente(UUID usuarioId, UUID loteId, UUID itemId,
                                                    AtualizarClienteBoletoRequest request) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        validacaoService.assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);

        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", request.getClienteId()));

        item.setCliente(cliente);
        item.setMetodoIdentificacao(MetodoIdentificacaoBoleto.MANUAL);
        item.setConfiancaIdentificacao(ConfiancaIdentificacaoBoleto.ALTA);
        item.setConfirmadoPeloUsuario(true);
        item.setEmailDestinatario(TelefoneClienteUtil.normalizarEmailOpcional(cliente.getEmail()));
        validacaoService.atualizarDuplicidade(item);
        validacaoService.recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        validacaoService.recalcularContadoresLote(lote);
        loteRepository.save(lote);

        auditoriaService.registrarNaTransacaoAtual("BOLETO_CLIENTE_ALTERADO_MANUAL", "EnvioBoleto", itemId,
                "clienteId=" + cliente.getClienteId());
        return mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse confirmarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        validacaoService.assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        if (item.getConfiancaIdentificacao() != ConfiancaIdentificacaoBoleto.BAIXA) {
            throw new BusinessRuleException("Confirmação explícita só é necessária para itens com confiança BAIXA.");
        }
        if (item.getCliente() == null) {
            throw new BusinessRuleException("Associe um cliente antes de confirmar.");
        }
        item.setConfirmadoPeloUsuario(true);
        validacaoService.recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        validacaoService.recalcularContadoresLote(lote);
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("BOLETO_ITEM_CONFIRMADO", "EnvioBoleto", itemId, null);
        return mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse ignorarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        validacaoService.assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        item.setStatus(StatusEnvioBoleto.IGNORADO);
        envioBoletoRepository.save(item);
        validacaoService.recalcularContadoresLote(lote);
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("BOLETO_ITEM_IGNORADO", "EnvioBoleto", itemId, null);
        return mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public LoteEnvioBoletoResponse reativarItem(UUID usuarioId, UUID loteId, UUID itemId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        validacaoService.assertLoteEditavel(lote);
        EnvioBoleto item = buscarItem(lote, itemId);
        if (item.getStatus() != StatusEnvioBoleto.IGNORADO) {
            throw new BusinessRuleException("Somente itens ignorados podem ser reativados.");
        }
        item.setStatus(StatusEnvioBoleto.PENDENTE_ANALISE);
        validacaoService.recalcularStatusItem(item);
        envioBoletoRepository.save(item);
        validacaoService.recalcularContadoresLote(lote);
        loteRepository.save(lote);
        return mapper.toLoteResponse(lote, validacaoService.montarBloqueiosItens(lote.getItens()));
    }

    @Transactional
    public ValidacaoLoteResponse validarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        return validacaoService.validar(buscarLoteComItens(loteId));
    }

    public EnviarLoteResponse enviarLote(UUID usuarioId, UUID loteId, EnviarLoteRequest request) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        return envioService.enviar(usuarioId, loteId, request);
    }

    @Transactional
    public void cancelarLote(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        LoteEnvioBoleto lote = buscarLoteComItens(loteId);
        if (lote.getStatus() == LoteEnvioBoletoEnvioService.EM_ENVIO) {
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
        return buscarItem(buscarLoteComItens(loteId), itemId);
    }

    @Transactional(readOnly = true)
    public String gerarCsvRelatorio(UUID usuarioId, UUID loteId) {
        accessService.assertPodeGerenciarBoletos(usuarioId);
        return relatorioService.gerarCsv(buscarLoteComItens(loteId));
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
}
