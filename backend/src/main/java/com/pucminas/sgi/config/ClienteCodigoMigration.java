package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

/**
 * Adiciona a coluna {@code codigo} na tabela cliente (SQLite existente).
 * Executa antes dos demais runners de importação/seed.
 */
@Component
@Order(0)
public class ClienteCodigoMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClienteCodigoMigration.class);

    private final DataSource dataSource;

    public ClienteCodigoMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try {
            String url = dataSource.getConnection().getMetaData().getURL();
            if (!url.contains("sqlite")) {
                return;
            }
        } catch (Exception e) {
            log.trace("Nao e SQLite, migracao de codigo ignorada.");
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> cols = jdbc.queryForList("PRAGMA table_info(cliente)");
        if (cols.isEmpty()) {
            return;
        }
        boolean hasCodigo = cols.stream()
                .anyMatch(c -> "codigo".equalsIgnoreCase(String.valueOf(c.get("name"))));
        if (!hasCodigo) {
            log.info("Aplicando migracao: adicionando coluna codigo em cliente.");
            jdbc.execute("ALTER TABLE cliente ADD COLUMN codigo VARCHAR(50)");
            log.info("Migracao cliente.codigo concluida.");
        } else {
            log.debug("Coluna cliente.codigo ja existe.");
        }

        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_codigo ON cliente(codigo)");
    }
}
