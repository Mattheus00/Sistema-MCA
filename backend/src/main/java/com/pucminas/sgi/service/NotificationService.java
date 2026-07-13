package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.NotificacaoResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.enums.TipoNotificacao;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.util.CobrancaEmailHtmlBuilder;
import com.pucminas.sgi.util.MoneyUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificacaoEmailRepository notificacaoRepository;
    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final EmailGateway emailGateway;
    private final String nomeEscritorioCobranca;
    private final int maxTentativasEmail;

    public NotificationService(NotificacaoEmailRepository notificacaoRepository,
                               ClienteRepository clienteRepository,
                               DividaRepository dividaRepository,
                               EmailGateway emailGateway,
                               @Value("${cobranca.email.nome-escritorio:Contabilidade São Judas Tadeu}") String nomeEscritorioCobranca,
                               @Value("${sgi.email.max-tentativas:5}") int maxTentativasEmail) {
        this.notificacaoRepository = notificacaoRepository;
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.emailGateway = emailGateway;
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
        BigDecimal valorDevido;
        String protocolo;
        String vencimento;
        String descricao;
        String assunto;
        String corpo;
        Divida dividaUnica = null;
        List<Divida> dividasAgregadas = null;

        if (dividaId != null) {
            Divida d = dividaRepository.findById(dividaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
            if (!d.getCliente().getClienteId().equals(clienteId)) {
                throw new BusinessRuleException("Dívida não pertence ao cliente informado.");
            }
            if (d.getValorDevedor().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("Dívida já está quitada.");
            }
            dividaUnica = d;
            valorDevido = d.getValorDevedor();
            protocolo = d.getProtocolo();
            vencimento = d.getVencimento().toString();
            descricao = d.getDescricao() != null ? d.getDescricao() : "-";
            assunto = "Cobrança - Débito em Aberto - " + protocolo;

            StringBuilder corpoBuilder = new StringBuilder();
            corpoBuilder.append("Prezado(a) ").append(cliente.getNome()).append(",\n\n");
            corpoBuilder.append("Identificamos um débito em aberto no valor de R$ ")
                    .append(MoneyUtil.centavosParaReais(valorDevido)).append(".\n\n");
            corpoBuilder.append("Protocolo: ").append(protocolo)
                    .append("\nVencimento: ").append(vencimento)
                    .append("\nDescrição: ").append(descricao);
            if (d.getItensServicos() != null && !d.getItensServicos().isEmpty()) {
                corpoBuilder.append("\n\nServiços prestados:\n");
                d.getItensServicos().forEach(item -> corpoBuilder.append("  - ")
                        .append(item.getServico().getNome())
                        .append(": R$ ")
                        .append(MoneyUtil.centavosParaReais(item.getValor()))
                        .append("\n"));
            }
            corpoBuilder.append("\n\nPor favor, regularize sua situação.\n\nAtenciosamente,\nEscritório de Contabilidade");
            corpo = corpoBuilder.toString();
        } else {
            List<Divida> abertas = new ArrayList<>(
                    dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, com.pucminas.sgi.enums.StatusDivida.EM_ABERTO));
            abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(
                    clienteId, com.pucminas.sgi.enums.StatusDivida.PARCIAL));
            abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(
                    clienteId, com.pucminas.sgi.enums.StatusDivida.VENCIDA));
            dividasAgregadas = abertas;
            valorDevido = abertas.stream().map(Divida::getValorDevedor).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (valorDevido.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("Cliente não possui débitos em aberto.");
            }
            StringBuilder corpoBuilder = new StringBuilder();
            corpoBuilder.append("Prezado(a) ").append(cliente.getNome()).append(",\n\n");
            corpoBuilder.append("Identificamos débitos em aberto no valor total de R$ ")
                    .append(MoneyUtil.centavosParaReais(valorDevido)).append(".\n\n");
            for (Divida d : abertas) {
                corpoBuilder.append("Protocolo: ").append(d.getProtocolo())
                        .append(" - Vencimento: ").append(d.getVencimento())
                        .append(" - Valor: R$ ").append(MoneyUtil.centavosParaReais(d.getValorDevedor())).append("\n");
            }
            corpoBuilder.append("\nPor favor, regularize sua situação.\n\nAtenciosamente,\nEscritório de Contabilidade");
            protocolo = "-";
            vencimento = "-";
            descricao = "Múltiplos débitos";
            assunto = "Cobrança - Débitos em Aberto";
            corpo = corpoBuilder.toString();
        }

        NotificacaoEmail notif = NotificacaoEmail.builder()
                .clienteId(clienteId)
                .dividaId(dividaId)
                .tipo(TipoNotificacao.COBRANCA)
                .emailDestino(cliente.getEmail())
                .assunto(assunto)
                .corpoEmail(corpo)
                .valorComunicado(valorDevido)
                .statusEnvio(StatusEnvio.PENDENTE)
                .tentativas(0)
                .proximaTentativa(LocalDateTime.now())
                .build();
        notif = notificacaoRepository.save(notif);

        String htmlCorpo;
        if (dividaUnica != null) {
            BigDecimal jurosCentavos = dividaUnica.getValorDevedor()
                    .subtract(dividaUnica.getValorOriginal()).max(BigDecimal.ZERO);
            htmlCorpo = CobrancaEmailHtmlBuilder.htmlCobrancaDividaUnica(
                    nomeEscritorioCobranca,
                    cliente.getNome(),
                    dividaUnica.getProtocolo(),
                    dividaUnica.getVencimento(),
                    CobrancaEmailHtmlBuilder.centavosParaReais(jurosCentavos),
                    CobrancaEmailHtmlBuilder.centavosParaReais(dividaUnica.getValorDevedor()));
        } else {
            BigDecimal jurosTotalCentavos = dividasAgregadas.stream()
                    .map(d -> d.getValorDevedor().subtract(d.getValorOriginal()).max(BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            List<CobrancaEmailHtmlBuilder.LinhaResumo> linhas = dividasAgregadas.stream()
                    .map(d -> new CobrancaEmailHtmlBuilder.LinhaResumo(
                            d.getProtocolo(),
                            d.getVencimento(),
                            CobrancaEmailHtmlBuilder.centavosParaReais(d.getValorDevedor())))
                    .toList();
            htmlCorpo = CobrancaEmailHtmlBuilder.htmlCobrancaAgregada(
                    nomeEscritorioCobranca,
                    cliente.getNome(),
                    linhas,
                    CobrancaEmailHtmlBuilder.centavosParaReais(jurosTotalCentavos),
                    CobrancaEmailHtmlBuilder.centavosParaReais(valorDevido));
        }
        notif.setCorpoHtml(htmlCorpo);
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
