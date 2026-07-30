package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

/**
 * Corrige CHECK de status_envio em notificacao_email no SQLite para incluir ESGOTADO.
 */
@Component
@Order(2)
public class NotificacaoStatusMigration {

    private static final Logger log = LoggerFactory.getLogger(NotificacaoStatusMigration.class);

    private static final String OLD_CHECK = "('PENDENTE','ENVIADO','FALHOU')";
    private static final String NEW_CHECK = "('PENDENTE','ENVIADO','FALHOU','ESGOTADO')";

    private final DataSource dataSource;

    public NotificacaoStatusMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runMigration() {
        try {
            String url = dataSource.getConnection().getMetaData().getURL();
            if (url == null || !url.contains("sqlite")) {
                return;
            }
        } catch (Exception e) {
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='notificacao_email'"
        );
        if (rows.isEmpty() || rows.get(0).get("sql") == null) {
            return;
        }

        String tableSql = String.valueOf(rows.get(0).get("sql"));
        if (tableSql.contains("'ESGOTADO'")) {
            return;
        }
        if (!tableSql.contains(OLD_CHECK)) {
            // Sem CHECK restritivo: STRING livre, nada a fazer.
            return;
        }

        log.info("Aplicando migracao: adicionando ESGOTADO ao CHECK de status_envio.");
        String createNew = tableSql
                .replace("CREATE TABLE notificacao_email ", "CREATE TABLE notificacao_email_new ")
                .replace("CREATE TABLE \"notificacao_email\" ", "CREATE TABLE notificacao_email_new ")
                .replace(OLD_CHECK, NEW_CHECK);

        jdbc.execute(createNew);
        jdbc.execute("INSERT INTO notificacao_email_new SELECT * FROM notificacao_email");

        List<String> indexSqls = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='notificacao_email' AND sql IS NOT NULL",
                String.class
        );

        jdbc.execute("DROP TABLE notificacao_email");
        jdbc.execute("ALTER TABLE notificacao_email_new RENAME TO notificacao_email");

        for (String idxSql : indexSqls) {
            if (idxSql != null && !idxSql.isEmpty()) {
                try {
                    jdbc.execute(idxSql);
                } catch (Exception e) {
                    log.warn("Indice de notificacao_email nao recriado: {}", e.getMessage());
                }
            }
        }
        log.info("Migracao status_envio ESGOTADO concluida.");
    }
}
