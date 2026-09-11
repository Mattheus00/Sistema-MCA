package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.config.SicoobProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Em produção, exige JWT_SECRET definido e diferente do valor padrão de desenvolvimento.
 */
@Component
@Profile("prod")
@Slf4j
@RequiredArgsConstructor
public class ProdStartupValidator {

    private static final String DEFAULT_DEV_SECRET_SHA256 = "30309f66e7f11ba823c3d1c0ddb6db155c7653adf34faa7c69d95a2f4e958fbf";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    private final SicoobProperties sicoobProperties;


    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        if (jwtSecret == null || jwtSecret.isBlank() || segredoPadraoDeDesenvolvimento(jwtSecret)) {
            throw new IllegalStateException(
                    "Em producao, defina JWT_SECRET (variavel de ambiente) com valor forte e unico.");
        }
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 bytes em UTF-8 em producao.");
        }
        if (!sicoobProperties.isMock()
                && (sicoobProperties.getWebhookSecret() == null || sicoobProperties.getWebhookSecret().isBlank())) {
            log.error("sicoob.webhook-secret está vazio com sicoob.mock=false. Webhooks serão rejeitados com 401.");
        }
        log.info("Perfil prod ativo. Banco: {}", datasourceUrl);
    }

    private boolean segredoPadraoDeDesenvolvimento(String segredo) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(segredo.getBytes(StandardCharsets.UTF_8));
            return DEFAULT_DEV_SECRET_SHA256.equals(HexFormat.of().formatHex(hash));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível para validar JWT_SECRET.", e);
        }
    }
}
