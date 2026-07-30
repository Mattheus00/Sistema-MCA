package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.repository.EmailConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Em produção, sincroniza variáveis SMTP_* do Render com email_config no banco.
 */
@Component
@Profile("prod")
public class SmtpEnvEmailConfigBootstrap {

    private static final Logger log = LoggerFactory.getLogger(SmtpEnvEmailConfigBootstrap.class);

    private final EmailConfigRepository emailConfigRepository;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private int smtpPort;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${spring.mail.password:}")
    private String smtpPass;

    @Value("${cobranca.email.nome-escritorio:Contabilidade São Judas Tadeu}")
    private String nomeRemetente;

    public SmtpEnvEmailConfigBootstrap(EmailConfigRepository emailConfigRepository) {
        this.emailConfigRepository = emailConfigRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void sincronizarConfigDoAmbiente() {
        if (smtpUser == null || smtpUser.isBlank() || smtpPass == null || smtpPass.isBlank()) {
            log.warn("SMTP_USER/SMTP_PASS não definidos no ambiente; envio de e-mail depende de email_config no banco.");
            return;
        }
        String host = (smtpHost != null && !smtpHost.isBlank()) ? smtpHost : "smtp.gmail.com";
        EmailConfig config = emailConfigRepository.findFirstByAtivoTrue()
                .orElseGet(() -> emailConfigRepository.findAll().stream().findFirst().orElse(null));
        if (config == null) {
            config = EmailConfig.builder()
                    .host(host)
                    .porta(smtpPort)
                    .usuario(smtpUser)
                    .senha(smtpPass)
                    .usarTLS(smtpPort != 465)
                    .emailRemetente(smtpUser)
                    .nomeRemetente(nomeRemetente)
                    .ativo(true)
                    .atualizadoEm(LocalDateTime.now())
                    .build();
            emailConfigRepository.save(config);
            log.info("Configuração SMTP criada a partir das variáveis de ambiente ({}).", smtpUser);
            return;
        }
        config.setHost(host);
        config.setPorta(smtpPort);
        config.setUsuario(smtpUser);
        config.setSenha(smtpPass);
        config.setUsarTLS(smtpPort != 465);
        config.setEmailRemetente(smtpUser);
        config.setNomeRemetente(nomeRemetente);
        config.setAtivo(true);
        config.setAtualizadoEm(LocalDateTime.now());
        emailConfigRepository.save(config);
        log.info("Configuração SMTP atualizada a partir das variáveis de ambiente ({}).", smtpUser);
    }
}
