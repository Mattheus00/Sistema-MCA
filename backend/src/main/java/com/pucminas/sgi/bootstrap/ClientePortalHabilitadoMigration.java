package com.pucminas.sgi.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

/**
 * Adiciona {@code portal_habilitado} em bancos SQLite existentes (compatível com ALTER sem NOT NULL).
 * Pode ser removida quando todos os devs recriarem {@code data/sgi.db}.
 */
@Component
@Order(0)
@Slf4j
@RequiredArgsConstructor
public class ClientePortalHabilitadoMigration implements CommandLineRunner {

    private final DataSource dataSource;


    @Override
    public void run(String... args) {
        if (!SqliteSchemaSupport.isSqlite(dataSource)) {
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> cols = jdbc.queryForList("PRAGMA table_info(cliente)");
        if (cols.isEmpty()) {
            return;
        }
        boolean hasCol = cols.stream()
                .anyMatch(c -> "portal_habilitado".equalsIgnoreCase(String.valueOf(c.get("name"))));
        if (!hasCol) {
            log.info("Aplicando migracao: adicionando coluna portal_habilitado em cliente.");
            jdbc.execute("ALTER TABLE cliente ADD COLUMN portal_habilitado BOOLEAN DEFAULT 1");
            jdbc.execute("UPDATE cliente SET portal_habilitado = 1 WHERE portal_habilitado IS NULL");
            log.info("Migracao cliente.portal_habilitado concluida.");
        }
    }
}
