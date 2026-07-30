package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.repository.EmailConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * Adapter para envio de emails via SMTP (JavaMailSender).
 * Configura a sessão a partir do EmailConfig do banco quando disponível.
 */
@Component
public class EmailGateway {

    private static final Logger log = LoggerFactory.getLogger(EmailGateway.class);

    private final EmailConfigRepository emailConfigRepository;
    private final JavaMailSender defaultMailSender;
    private JavaMailSenderImpl dynamicSender;

    @Value("${spring.mail.username:}")
    private String defaultMailUsername;

    @Value("${cobranca.email.nome-escritorio:Contabilidade São Judas Tadeu}")
    private String defaultNomeRemetente;

    @Autowired(required = false)
    public EmailGateway(EmailConfigRepository emailConfigRepository,
                        JavaMailSender defaultMailSender) {
        this.emailConfigRepository = emailConfigRepository;
        this.defaultMailSender = defaultMailSender;
    }

    /**
     * Configura a sessão de email a partir da configuração ativa no banco.
     * Porta 465 → SSL implícito (Zoho, etc.). Porta 587 → STARTTLS.
     */
    public void configurarSessao() {
        dynamicSender = null;
        emailConfigRepository.findFirstByAtivoTrue().ifPresent(config -> {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(config.getHost());
            sender.setPort(config.getPorta());
            sender.setUsername(config.getUsuario());
            sender.setPassword(config.getSenha());
            Properties props = sender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            int porta = config.getPorta() != null ? config.getPorta() : 587;
            boolean sslImplicito = porta == 465;
            if (sslImplicito) {
                props.put("mail.smtp.ssl.enable", "true");
                props.put("mail.smtp.socketFactory.port", String.valueOf(porta));
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtp.starttls.enable", "false");
            } else {
                boolean tls = Boolean.TRUE.equals(config.getUsarTLS());
                props.put("mail.smtp.starttls.enable", String.valueOf(tls));
                props.put("mail.smtp.ssl.enable", "false");
            }
            dynamicSender = sender;
        });
    }

    /**
     * Envia email de cobrança/lembrete.
     */
    public void enviar(String destinatario, String assunto, String corpo, java.math.BigDecimal valorDevido) {
        JavaMailSender sender = obterSender();
        if (sender == null) {
            throw new EmailSendException("Nenhuma configuração SMTP ativa disponível para envio.");
        }
        String remetente = obterRemetente();
        String nomeRemetente = obterNomeRemetente();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(formatarRemetente(remetente, nomeRemetente));
        message.setTo(destinatario);
        message.setSubject(assunto);
        message.setText(corpo);
        try {
            sender.send(message);
            log.info("Email enviado para {} - assunto: {}", destinatario, assunto);
        } catch (Exception e) {
            log.error("Falha ao enviar email para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        }
    }

    /**
     * Envia e-mail com parte texto e parte HTML (clientes como Gmail exibem o HTML com botões/links).
     */
    public void enviarTextoEHtml(String destinatario, String assunto, String textoPlano, String html) {
        JavaMailSender sender = obterSender();
        if (sender == null) {
            throw new EmailSendException("Nenhuma configuração SMTP ativa disponível para envio.");
        }
        String remetente = obterRemetente();
        if (remetente == null || remetente.isBlank()) {
            throw new EmailSendException("Email remetente não configurado.");
        }
        String nomeRemetente = obterNomeRemetente();
        boolean multipart = html != null && !html.isBlank();
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, multipart, "UTF-8");
            helper.setFrom(criarEnderecoRemetente(remetente, nomeRemetente));
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(textoPlano != null ? textoPlano : "", html != null ? html : "");
            sender.send(message);
            log.info("Email HTML enviado para {} - assunto: {}", destinatario, assunto);
        } catch (MessagingException e) {
            log.error("Falha ao montar/enviar email MIME para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Falha ao enviar email para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        }
    }

    /**
     * Envia e-mail com texto, HTML opcional e anexo PDF.
     */
    public void enviarComAnexoPdf(String destinatario, String assunto, String textoPlano, String html,
                                  byte[] pdfBytes, String nomeAnexo) {
        JavaMailSender sender = obterSender();
        if (sender == null) {
            throw new EmailSendException("Nenhuma configuração SMTP ativa disponível para envio.");
        }
        String remetente = obterRemetente();
        if (remetente == null || remetente.isBlank()) {
            throw new EmailSendException("Email remetente não configurado.");
        }
        String nomeRemetente = obterNomeRemetente();
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(criarEnderecoRemetente(remetente, nomeRemetente));
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(textoPlano != null ? textoPlano : "", html != null ? html : "");
            String anexo = (nomeAnexo != null && !nomeAnexo.isBlank()) ? nomeAnexo : "boleto.pdf";
            if (!anexo.toLowerCase().endsWith(".pdf")) {
                anexo = anexo + ".pdf";
            }
            helper.addAttachment(anexo, new ByteArrayResource(pdfBytes), "application/pdf");
            sender.send(message);
            log.info("Email com anexo PDF enviado para {} - assunto: {}", destinatario, assunto);
        } catch (MessagingException e) {
            log.error("Falha ao montar/enviar email com anexo para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Falha ao enviar email com anexo para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        }
    }

    private JavaMailSender obterSender() {
        configurarSessao();
        if (dynamicSender != null) {
            return dynamicSender;
        }
        return defaultMailSender;
    }

    private String obterRemetente() {
        return emailConfigRepository.findFirstByAtivoTrue()
                .map(EmailConfig::getEmailRemetente)
                .filter(email -> email != null && !email.isBlank())
                .orElseGet(() -> defaultMailUsername != null && !defaultMailUsername.isBlank()
                        ? defaultMailUsername
                        : null);
    }

    private String obterNomeRemetente() {
        return emailConfigRepository.findFirstByAtivoTrue()
                .map(EmailConfig::getNomeRemetente)
                .filter(nome -> nome != null && !nome.isBlank())
                .orElse(defaultNomeRemetente);
    }

    private InternetAddress criarEnderecoRemetente(String remetente, String nomeRemetente) {
        try {
            if (nomeRemetente != null && !nomeRemetente.isBlank()) {
                return new InternetAddress(remetente, nomeRemetente, StandardCharsets.UTF_8.name());
            }
            return new InternetAddress(remetente);
        } catch (AddressException | UnsupportedEncodingException e) {
            throw new EmailSendException("Falha ao codificar nome do remetente: " + e.getMessage(), e);
        }
    }

    private String formatarRemetente(String remetente, String nomeRemetente) {
        return criarEnderecoRemetente(remetente, nomeRemetente).toString();
    }

    /**
     * Verifica se há configuração SMTP ativa e remetente definido.
     */
    public boolean hasConfigAtiva() {
        configurarSessao();
        String remetente = obterRemetente();
        return (dynamicSender != null || defaultMailSender != null)
                && remetente != null
                && !remetente.isBlank();
    }
}
