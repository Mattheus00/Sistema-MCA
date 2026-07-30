package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Ativa WAL e busy timeout no SQLite para reduzir erros de lock em escrita concorrente.
 */
@Component
public class SqliteWalConfig implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SqliteWalConfig.class);

    private final DataSource dataSource;

    public SqliteWalConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {
            String url = conn.getMetaData().getURL();
            if (url == null || !url.toLowerCase().contains("sqlite")) {
                return;
            }
            st.execute("PRAGMA journal_mode=WAL");
            st.execute("PRAGMA busy_timeout=5000");
            st.execute("PRAGMA synchronous=NORMAL");
            log.info("SQLite WAL e busy_timeout configurados.");
        } catch (Exception e) {
            log.warn("Não foi possível configurar WAL do SQLite: {}", e.getMessage());
        }
    }
}
