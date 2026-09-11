package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.EnviarLoteRequest;
import com.pucminas.sgi.dto.response.EnviarLoteResponse;
import com.pucminas.sgi.dto.response.ResultadoEnvioItemResponse;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ConflictException;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import com.pucminas.sgi.security.EnvioBoletoAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LoteEnvioBoletoEnvioService {

    static final StatusLoteEnvioBoleto EM_ENVIO = StatusLoteEnvioBoleto.PROCESSANDO;

    private final LoteEnvioBoletoRepository loteRepository;
    private final EnvioBoletoRepository envioBoletoRepository;
    private final EnvioBoletoAccessService accessService;
    private final BoletoArquivoStorageService storageService;
    private final EnvioBoletoEmailService emailService;
    private final AuditoriaService auditoriaService;
    private final LoteEnvioBoletoMapper mapper;
    private final LoteEnvioBoletoValidacaoService validacaoService;
    private final PlatformTransactionManager transactionManager;
    private final Clock clock;

    public EnviarLoteResponse enviar(UUID usuarioId, UUID loteId, EnviarLoteRequest request) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        PreparacaoEnvio prep = tx.execute(status -> iniciarEnvio(usuarioId, loteId, request));
        List<ResultadoEnvioInterno> resultados = new ArrayList<>();
        try {
            resultados.addAll(enviarEmailsForaDaTransacao(prep));
        } catch (RuntimeException e) {
            log.error("Falha inesperada no envio SMTP do lote {}", loteId, e);
            marcarRestanteComoErro(prep, resultados, "Falha inesperada no envio.");
        }
        List<ResultadoEnvioInterno> finais = List.copyOf(resultados);
        return tx.execute(status -> finalizarEnvio(prep, finais));
    }

    PreparacaoEnvio iniciarEnvio(UUID usuarioId, UUID loteId, EnviarLoteRequest request) {
        LoteEnvioBoleto lote = loteRepository.lockById(loteId)
                .orElseThrow(() -> new ResourceNotFoundException("LoteEnvioBoleto", loteId));
        lote.getItens().size();
        if (lote.getStatus() == EM_ENVIO) {
            throw new ConflictException("Lote já está em envio.");
        }
        if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
            throw new BusinessRuleException("Lote cancelado.");
        }

        validacaoService.atualizarStatusItensDoLote(lote);

        boolean permitirDuplicado = request != null && Boolean.TRUE.equals(request.getPermitirReenvioDuplicado());
        List<UUID> itemIdsFiltro = validacaoService.filtrarItemIdsExistentesNoLote(
                lote, LoteEnvioBoletoValidacaoService.normalizarItemIds(request != null ? request.getItemIds() : null));

        List<EnvioBoleto> candidatos = LoteEnvioBoletoValidacaoService.filtrarCandidatosEnvio(lote.getItens(), itemIdsFiltro);

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
            List<String> bloqueios = validacaoService.calcularBloqueiosItem(item, permitirDuplicado);
            if (!bloqueios.isEmpty()) {
                throw new BusinessRuleException("Item bloqueado: " + item.getNomeArquivoOriginal()
                        + " — " + String.join("; ", bloqueios));
            }
        }

        lote.setStatus(EM_ENVIO);
        lote.setDataConfirmacao(LocalDateTime.now(clock));
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_ENVIO_INICIADO", "LoteEnvioBoleto", loteId,
                "itens=" + candidatos.size());

        List<ItemEnvioSnapshot> snapshots = new ArrayList<>();
        for (EnvioBoleto item : candidatos) {
            boolean eraErro = item.getStatus() == StatusEnvioBoleto.ERRO;
            item.setStatus(StatusEnvioBoleto.ENVIANDO);
            item.setQuantidadeTentativas(item.getQuantidadeTentativas() + 1);
            envioBoletoRepository.save(item);
            snapshots.add(new ItemEnvioSnapshot(
                    item.getEnvioBoletoId(),
                    item.getNomeArquivoArmazenado(),
                    eraErro,
                    Boolean.TRUE.equals(item.getReenvio())));
        }
        return new PreparacaoEnvio(loteId, usuarioId, snapshots);
    }

    EnviarLoteResponse finalizarEnvio(PreparacaoEnvio prep, List<ResultadoEnvioInterno> resultados) {
        LoteEnvioBoleto lote = loteRepository.findById(prep.loteId())
                .orElseThrow(() -> new ResourceNotFoundException("LoteEnvioBoleto", prep.loteId()));
        lote.getItens().size();
        Usuario usuario = accessService.assertPodeGerenciarBoletos(prep.usuarioId());
        Map<UUID, EnvioBoleto> porId = lote.getItens().stream()
                .collect(Collectors.toMap(EnvioBoleto::getEnvioBoletoId, Function.identity()));

        int enviados = 0;
        int erros = 0;
        List<ResultadoEnvioItemResponse> respostas = new ArrayList<>();
        for (ResultadoEnvioInterno resultado : resultados) {
            EnvioBoleto item = porId.get(resultado.itemId());
            if (item == null) {
                continue;
            }
            if (resultado.sucesso()) {
                item.setStatus(StatusEnvioBoleto.ENVIADO);
                item.setDataEnvio(LocalDateTime.now(clock));
                item.setMensagemErro(null);
                item.setEnviadoPor(usuario);
                item.setSimulado(resultado.simulado());
                if (resultado.eraErro() || resultado.reenvioAnterior()) {
                    item.setReenvio(true);
                }
                enviados++;
                auditoriaService.registrarNaTransacaoAtual(
                        Boolean.TRUE.equals(item.getReenvio()) ? "BOLETO_REENVIO" : "BOLETO_ENVIADO",
                        "EnvioBoleto", item.getEnvioBoletoId(),
                        "simulado=" + item.getSimulado());
            } else {
                item.setStatus(StatusEnvioBoleto.ERRO);
                item.setMensagemErro(resultado.mensagemErro());
                erros++;
                auditoriaService.registrarNaTransacaoAtual("BOLETO_ENVIO_ERRO", "EnvioBoleto", item.getEnvioBoletoId(),
                        resultado.mensagemErro());
            }
            envioBoletoRepository.save(item);
            respostas.add(mapper.toResultado(item));
        }

        validacaoService.recalcularContadoresLote(lote);
        lote.setDataFinalizacao(LocalDateTime.now(clock));
        lote.setStatus(erros > 0 ? StatusLoteEnvioBoleto.CONCLUIDO_COM_ERROS : StatusLoteEnvioBoleto.CONCLUIDO);
        loteRepository.save(lote);
        auditoriaService.registrarNaTransacaoAtual("LOTE_BOLETO_ENVIO_CONCLUIDO", "LoteEnvioBoleto", prep.loteId(),
                "enviados=" + enviados + ",erros=" + erros);

        return EnviarLoteResponse.builder()
                .loteId(prep.loteId())
                .statusLote(lote.getStatus().name())
                .totalProcessados(resultados.size())
                .enviados(enviados)
                .erros(erros)
                .ignorados((int) lote.getItens().stream().filter(i -> i.getStatus() == StatusEnvioBoleto.IGNORADO).count())
                .resultados(respostas)
                .build();
    }

    private List<ResultadoEnvioInterno> enviarEmailsForaDaTransacao(PreparacaoEnvio prep) {
        List<ResultadoEnvioInterno> resultados = new ArrayList<>();
        for (ItemEnvioSnapshot snap : prep.itens()) {
            EnvioBoleto item = envioBoletoRepository.findById(snap.itemId())
                    .orElseThrow(() -> new ResourceNotFoundException("EnvioBoleto", snap.itemId()));
            try {
                byte[] pdf = storageService.ler(prep.loteId(), snap.nomeArquivoArmazenado());
                emailService.enviarBoleto(item, pdf);
                resultados.add(new ResultadoEnvioInterno(
                        snap.itemId(), true, null, Boolean.TRUE.equals(item.getSimulado()),
                        snap.eraErro(), snap.reenvioAnterior()));
            } catch (EmailSendException | BusinessRuleException e) {
                log.warn("Falha ao enviar boleto {}: {}", snap.itemId(), e.getMessage());
                resultados.add(new ResultadoEnvioInterno(
                        snap.itemId(), false, e.getMessage(), false, snap.eraErro(), snap.reenvioAnterior()));
            } catch (Exception e) {
                log.error("Erro inesperado ao enviar boleto {}", snap.itemId(), e);
                resultados.add(new ResultadoEnvioInterno(
                        snap.itemId(), false, "Falha inesperada no envio.", false,
                        snap.eraErro(), snap.reenvioAnterior()));
            }
        }
        return resultados;
    }

    private static void marcarRestanteComoErro(PreparacaoEnvio prep, List<ResultadoEnvioInterno> resultados,
                                               String mensagem) {
        var jaProcessados = resultados.stream().map(ResultadoEnvioInterno::itemId).collect(Collectors.toSet());
        for (ItemEnvioSnapshot snap : prep.itens()) {
            if (!jaProcessados.contains(snap.itemId())) {
                resultados.add(new ResultadoEnvioInterno(
                        snap.itemId(), false, mensagem, false, snap.eraErro(), snap.reenvioAnterior()));
            }
        }
    }

    record PreparacaoEnvio(UUID loteId, UUID usuarioId, List<ItemEnvioSnapshot> itens) {
    }

    record ItemEnvioSnapshot(UUID itemId, String nomeArquivoArmazenado, boolean eraErro, boolean reenvioAnterior) {
    }

    record ResultadoEnvioInterno(UUID itemId, boolean sucesso, String mensagemErro, boolean simulado,
                                 boolean eraErro, boolean reenvioAnterior) {
    }
}
