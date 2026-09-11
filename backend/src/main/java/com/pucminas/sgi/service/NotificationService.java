package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.NotificacaoResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.enums.TipoNotificacao;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.service.email.AvisoPendenciaEmailTemplateBuilder;
import com.pucminas.sgi.service.email.CobrancaEmailComposer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class NotificationService {

    private final NotificacaoEmailRepository notificacaoRepository;
    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final EmailGateway emailGateway;
    private final BoletoArquivoValidator boletoArquivoValidator;
    private final CobrancaEmailComposer cobrancaEmailComposer;
    private final String nomeEscritorioCobranca;
    private final int maxTentativasEmail;

    public NotificationService(NotificacaoEmailRepository notificacaoRepository,
                               ClienteRepository clienteRepository,
                               DividaRepository dividaRepository,
                               EmailGateway emailGateway,
                               BoletoArquivoValidator boletoArquivoValidator,
                               CobrancaEmailComposer cobrancaEmailComposer,
                               @Value("${cobranca.email.nome-escritorio:Contabilidade São Judas Tadeu}") String nomeEscritorioCobranca,
                               @Value("${sgi.email.max-tentativas:5}") int maxTentativasEmail) {
        this.notificacaoRepository = notificacaoRepository;
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.emailGateway = emailGateway;
        this.boletoArquivoValidator = boletoArquivoValidator;
        this.cobrancaEmailComposer = cobrancaEmailComposer;
        this.nomeEscritorioCobranca = nomeEscritorioCobranca;
        this.maxTentativasEmail = Math.max(1, maxTentativasEmail);
    }

    @Transactional
    public NotificacaoResponseDTO enviarCobrancaEmail(UUID clienteId, UUID dividaId) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        if (cliente.getEmail() == null || cliente.getEmail().isBlank()) {
            throw new BusinessRuleException("Cliente não possui email cadastrado para envio de cobrança.");
        }
        if (!emailGateway.hasConfigAtiva()) {
            throw new BusinessRuleException("Nenhuma configuração SMTP ativa. Configure o envio de emails em /api/email-config.");
        }

        CobrancaEmailComposer.CobrancaEmailContexto ctx = cobrancaEmailComposer.montar(cliente, dividaId);
        String assunto = ctx.assunto();
        String corpo = cobrancaEmailComposer.renderizarTexto(ctx);
        String htmlCorpo = cobrancaEmailComposer.renderizarHtml(nomeEscritorioCobranca, ctx);

        NotificacaoEmail notif = NotificacaoEmail.builder()
                .clienteId(clienteId)
                .dividaId(dividaId)
                .tipo(TipoNotificacao.COBRANCA)
                .emailDestino(cliente.getEmail())
                .assunto(assunto)
                .corpoEmail(corpo)
                .corpoHtml(htmlCorpo)
                .valorComunicado(ctx.valorDevido())
                .statusEnvio(StatusEnvio.PENDENTE)
                .tentativas(0)
                .proximaTentativa(LocalDateTime.now())
                .build();
        notif = notificacaoRepository.save(notif);

        try {
            emailGateway.enviarTextoEHtml(
                    cliente.getEmail(), assunto, notif.getCorpoEmail(), notif.getCorpoHtml());
            notif.setStatusEnvio(StatusEnvio.ENVIADO);
            notif.setDataEnvio(LocalDateTime.now());
        } catch (Exception e) {
            registrarFalhaEnvio(notif, e.getMessage());
        }
        notificacaoRepository.save(notif);
        return toResponse(notif);
    }

    /**
     * Envia o PDF do aviso de pendência (gerado no frontend) para o e-mail do cliente via SMTP (Gmail),
     * no mesmo canal usado para boletos.
     */
    @Transactional(noRollbackFor = EmailSendException.class)
    public NotificacaoResponseDTO enviarAvisoPendenciaPdf(UUID clienteId, MultipartFile arquivo) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        if (cliente.getEmail() == null || cliente.getEmail().isBlank()) {
            throw new BusinessRuleException("Cliente não possui email cadastrado para envio do aviso.");
        }
        if (!emailGateway.hasConfigAtiva()) {
            throw new BusinessRuleException("Nenhuma configuração SMTP ativa. Configure o envio de emails em /api/email-config.");
        }
        boletoArquivoValidator.validar(arquivo);

        byte[] pdfBytes;
        try {
            pdfBytes = arquivo.getBytes();
        } catch (Exception e) {
            throw new BusinessRuleException("Não foi possível ler o arquivo PDF.");
        }

        String nomeAnexo = arquivo.getOriginalFilename();
        if (nomeAnexo == null || nomeAnexo.isBlank()) {
            nomeAnexo = "aviso-pendencia.pdf";
        }
        String assunto = AvisoPendenciaEmailTemplateBuilder.assunto(nomeEscritorioCobranca);
        String texto = AvisoPendenciaEmailTemplateBuilder.textoPlano(cliente.getNome(), nomeEscritorioCobranca);
        String html = AvisoPendenciaEmailTemplateBuilder.html(cliente.getNome(), nomeEscritorioCobranca);

        List<Divida> abertas = new ArrayList<>(
                dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, com.pucminas.sgi.enums.StatusDivida.EM_ABERTO));
        abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(
                clienteId, com.pucminas.sgi.enums.StatusDivida.PARCIAL));
        abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(
                clienteId, com.pucminas.sgi.enums.StatusDivida.VENCIDA));
        BigDecimal valorComunicado = abertas.stream()
                .map(Divida::getValorDevedor)
                .map(v -> v != null ? v : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        NotificacaoEmail notif = NotificacaoEmail.builder()
                .clienteId(clienteId)
                .dividaId(null)
                .tipo(TipoNotificacao.COBRANCA)
                .emailDestino(cliente.getEmail().trim())
                .assunto(assunto)
                .corpoEmail(texto)
                .corpoHtml(html)
                .valorComunicado(valorComunicado != null ? valorComunicado : BigDecimal.ZERO)
                .statusEnvio(StatusEnvio.PENDENTE)
                .tentativas(0)
                .proximaTentativa(LocalDateTime.now())
                .build();
        notif = notificacaoRepository.saveAndFlush(notif);

        try {
            emailGateway.enviarComAnexoPdf(
                    cliente.getEmail().trim(),
                    assunto,
                    texto,
                    html,
                    pdfBytes,
                    nomeAnexo);
            notif.setStatusEnvio(StatusEnvio.ENVIADO);
            notif.setDataEnvio(LocalDateTime.now());
            notif.setMensagemErro(null);
            log.info("Aviso de pendência PDF enviado para cliente {} ({})", clienteId, cliente.getEmail());
        } catch (Exception e) {
            registrarFalhaEnvio(notif, e.getMessage());
            log.warn("Falha ao enviar aviso de pendência PDF para {}: {}", clienteId, e.getMessage());
            notificacaoRepository.save(notif);
            throw new EmailSendException(
                    e.getMessage() != null && !e.getMessage().isBlank()
                            ? e.getMessage()
                            : "Falha ao enviar o aviso de pendência por e-mail.",
                    e);
        }
        notificacaoRepository.save(notif);
        return toResponse(notif);
    }

    @Transactional
    public int reprocessarFalhas() {
        List<NotificacaoEmail> falhas = notificacaoRepository
                .findByStatusEnvioAndProximaTentativaBefore(StatusEnvio.FALHOU, LocalDateTime.now());
        int enviados = 0;
        for (NotificacaoEmail notif : falhas) {
            int tentativasAtuais = notif.getTentativas() == null ? 0 : notif.getTentativas();
            if (tentativasAtuais >= maxTentativasEmail) {
                notif.setStatusEnvio(StatusEnvio.ESGOTADO);
                notif.setMensagemErro("Número máximo de tentativas esgotado (" + maxTentativasEmail + ").");
                notificacaoRepository.save(notif);
                continue;
            }
            try {
                if (notif.getCorpoHtml() != null && !notif.getCorpoHtml().isBlank()) {
                    emailGateway.enviarTextoEHtml(
                            notif.getEmailDestino(), notif.getAssunto(), notif.getCorpoEmail(), notif.getCorpoHtml());
                } else {
                    emailGateway.enviar(
                            notif.getEmailDestino(), notif.getAssunto(), notif.getCorpoEmail(), notif.getValorComunicado());
                }
                notif.setStatusEnvio(StatusEnvio.ENVIADO);
                notif.setDataEnvio(LocalDateTime.now());
                notificacaoRepository.save(notif);
                enviados++;
            } catch (Exception e) {
                registrarFalhaEnvio(notif, e.getMessage());
                notificacaoRepository.save(notif);
            }
        }
        log.info("Reprocessamento de falhas: {} reenviados de {}", enviados, falhas.size());
        return enviados;
    }

    private void registrarFalhaEnvio(NotificacaoEmail notif, String erro) {
        int tentativas = (notif.getTentativas() == null ? 0 : notif.getTentativas()) + 1;
        notif.setTentativas(tentativas);
        notif.setMensagemErro(erro);
        if (tentativas >= maxTentativasEmail) {
            notif.setStatusEnvio(StatusEnvio.ESGOTADO);
            notif.setProximaTentativa(null);
            log.warn("E-mail {} esgotou {} tentativas.", notif.getNotificacaoId(), maxTentativasEmail);
        } else {
            notif.setStatusEnvio(StatusEnvio.FALHOU);
            notif.setProximaTentativa(LocalDateTime.now().plusHours(1));
        }
    }

    @Transactional(readOnly = true)
    public List<NotificacaoResponseDTO> consultarHistoricoNotificacoes(UUID clienteId) {
        return notificacaoRepository.findByClienteIdOrderByDataEnvioDesc(clienteId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private NotificacaoResponseDTO toResponse(NotificacaoEmail n) {
        return NotificacaoResponseDTO.builder()
                .notificacaoId(n.getNotificacaoId())
                .clienteId(n.getClienteId())
                .dividaId(n.getDividaId())
                .tipo(n.getTipo())
                .emailDestino(n.getEmailDestino())
                .assunto(n.getAssunto())
                .valorComunicado(n.getValorComunicado())
                .statusEnvio(n.getStatusEnvio())
                .tentativas(n.getTentativas())
                .dataEnvio(n.getDataEnvio())
                .mensagemErro(n.getMensagemErro())
                .criadoEm(n.getCriadoEm())
                .build();
    }
}
