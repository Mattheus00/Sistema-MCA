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
 * Adiciona a coluna {@code codigo} na tabela cliente (SQLite existente).
 * Executa antes dos demais runners de importação/seed.
 * Pode ser removida quando todos os devs recriarem {@code data/sgi.db}.
 */
@Component
@Order(0)
@Slf4j
@RequiredArgsConstructor
public class ClienteCodigoMigration implements CommandLineRunner {

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
