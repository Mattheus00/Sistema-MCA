package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Garante tabelas/colunas do portal e documentos no PostgreSQL de produção
 * (complementa ddl-auto=update quando o índice/coluna falhou na criação inicial).
 */
@Component
@Profile("prod")
public class PostgresPortalSchemaBootstrap {

    private static final Logger log = LoggerFactory.getLogger(PostgresPortalSchemaBootstrap.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public PostgresPortalSchemaBootstrap(DataSource dataSource) {
        this.dataSource = dataSource;
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensureSchema() {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            if (url == null || !url.contains("postgresql")) {
                return;
            }
        } catch (Exception e) {
            log.warn("Não foi possível identificar o banco para bootstrap de schema: {}", e.getMessage());
            return;
        }

        try {
            jdbc.execute("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS portal_habilitado BOOLEAN DEFAULT TRUE");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS documento_cliente (
                        documento_id UUID PRIMARY KEY,
                        cliente_id UUID NOT NULL,
                        divida_id UUID,
                        tipo VARCHAR(50) NOT NULL,
                        nome_original VARCHAR(255) NOT NULL,
                        nome_armazenado VARCHAR(255) NOT NULL,
                        content_type VARCHAR(255) NOT NULL,
                        tamanho_bytes BIGINT NOT NULL,
                        hash_sha256 VARCHAR(64) NOT NULL,
                        observacao_cliente TEXT,
                        resposta_escritorio TEXT,
                        respondido_em TIMESTAMP,
                        respondido_por_id UUID,
                        status VARCHAR(50) NOT NULL,
                        enviado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_cliente ON documento_cliente(cliente_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_divida ON documento_cliente(divida_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_status ON documento_cliente(status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_enviado ON documento_cliente(enviado_em)");

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS cliente_portal_credencial (
                        credencial_id UUID PRIMARY KEY,
                        cliente_id UUID NOT NULL UNIQUE,
                        senha VARCHAR(255) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        ultimo_acesso TIMESTAMP,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_portal_credencial_cliente ON cliente_portal_credencial(cliente_id)");

            jdbc.execute("ALTER TABLE notificacao_email ADD COLUMN IF NOT EXISTS corpo_html TEXT");

            log.info("Bootstrap de schema Postgres (portal/documentos) concluído.");
        } catch (Exception e) {
            log.error("Falha no bootstrap de schema Postgres: {}", e.getMessage(), e);
        }
    }
}
