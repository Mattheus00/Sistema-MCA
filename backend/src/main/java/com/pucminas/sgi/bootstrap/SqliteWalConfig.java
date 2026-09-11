package com.pucminas.sgi.bootstrap;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Ativa WAL e busy timeout no SQLite para reduzir erros de lock em escrita concorrente.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class SqliteWalConfig implements ApplicationRunner {

    private final DataSource dataSource;


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
