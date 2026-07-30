package com.pucminas.sgi.service;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.util.BoletoEmailTemplateBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EnvioBoletoEmailService {

    private static final Logger log = LoggerFactory.getLogger(EnvioBoletoEmailService.class);

    private final EmailGateway emailGateway;
    private final BoletoEnvioProperties boletoProperties;
    private final boolean emailEnabled;

    public EnvioBoletoEmailService(EmailGateway emailGateway,
                                   BoletoEnvioProperties boletoProperties,
                                   @Value("${sgi.email.enabled:true}") boolean emailEnabled) {
        this.emailGateway = emailGateway;
        this.boletoProperties = boletoProperties;
        this.emailEnabled = emailEnabled;
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }

    public void enviarBoleto(EnvioBoleto item, byte[] pdfBytes) {
        String nomeEmpresa = boletoProperties.getNomeEscritorio();
        String nomeCliente = item.getCliente() != null ? item.getCliente().getNome() : "Cliente";
        String assunto = BoletoEmailTemplateBuilder.assunto(nomeEmpresa);
        String texto = BoletoEmailTemplateBuilder.textoPlano(nomeCliente, nomeEmpresa);
        String html = BoletoEmailTemplateBuilder.html(nomeCliente, nomeEmpresa);

        if (!emailEnabled) {
            log.info("Simulação de envio de boleto para {} (sgi.email.enabled=false)", item.getEmailDestinatario());
            item.setSimulado(true);
            return;
        }

        if (!emailGateway.hasConfigAtiva()) {
            throw new EmailSendException("Nenhuma configuração SMTP ativa. Configure em /api/email-config.");
        }

        emailGateway.enviarComAnexoPdf(
                item.getEmailDestinatario(),
                assunto,
                texto,
                html,
                pdfBytes,
                item.getNomeArquivoOriginal());
        item.setSimulado(false);
    }
}
