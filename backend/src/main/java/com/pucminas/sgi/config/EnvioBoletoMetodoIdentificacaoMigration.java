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
 * Atualiza CHECK de metodo_identificacao em envio_boleto para incluir CODIGO_CLIENTE.
 */
@Component
@Order(1)
public class EnvioBoletoMetodoIdentificacaoMigration {

    private static final Logger log = LoggerFactory.getLogger(EnvioBoletoMetodoIdentificacaoMigration.class);

    private static final String OLD_CHECK =
            "metodo_identificacao in ('CPF_CNPJ','NOME_EXATO','NOME_APROXIMADO','MANUAL','NAO_IDENTIFICADO')";
    private static final String NEW_CHECK =
            "metodo_identificacao in ('CODIGO_CLIENTE','CPF_CNPJ','NOME_EXATO','NOME_APROXIMADO','MANUAL','NAO_IDENTIFICADO')";

    private final DataSource dataSource;

    public EnvioBoletoMetodoIdentificacaoMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runMigration() {
        try {
            String url = dataSource.getConnection().getMetaData().getURL();
            if (!url.contains("sqlite")) {
                return;
            }
        } catch (Exception e) {
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='envio_boleto'"
        );
        if (rows.isEmpty() || rows.get(0).get("sql") == null) {
            return;
        }

        String tableSql = (String) rows.get(0).get("sql");
        if (tableSql.contains("CODIGO_CLIENTE")) {
            log.debug("Tabela envio_boleto já inclui CODIGO_CLIENTE no CHECK.");
            return;
        }
        if (!tableSql.contains(OLD_CHECK)) {
            log.warn("CHECK de envio_boleto.metodo_identificacao em formato inesperado; migração não aplicada.");
            return;
        }

        log.info("Aplicando migração: adicionando CODIGO_CLIENTE ao CHECK de metodo_identificacao.");

        String createNew = tableSql
                .replace("CREATE TABLE envio_boleto ", "CREATE TABLE envio_boleto_new ")
                .replace("CREATE TABLE \"envio_boleto\" ", "CREATE TABLE envio_boleto_new ")
                .replace(OLD_CHECK, NEW_CHECK);

        List<String> columns = jdbc.query("PRAGMA table_info(envio_boleto)",
                (rs, rowNum) -> rs.getString("name"));
        String colList = String.join(", ", columns);

        jdbc.execute(createNew);
        jdbc.execute("INSERT INTO envio_boleto_new (" + colList + ") SELECT " + colList + " FROM envio_boleto");

        List<String> indexSqls = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='envio_boleto' AND sql IS NOT NULL",
                String.class
        );

        jdbc.execute("DROP TABLE envio_boleto");
        jdbc.execute("ALTER TABLE envio_boleto_new RENAME TO envio_boleto");

        for (String idxSql : indexSqls) {
            if (idxSql != null && !idxSql.isEmpty()) {
                try {
                    jdbc.execute(idxSql);
                } catch (Exception e) {
                    log.warn("Índice envio_boleto não recriado: {}", e.getMessage());
                }
            }
        }

        log.info("Migração envio_boleto concluída: CODIGO_CLIENTE permitido.");
    }
}
