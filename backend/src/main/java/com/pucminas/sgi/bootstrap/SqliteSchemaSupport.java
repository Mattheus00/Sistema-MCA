package com.pucminas.sgi.bootstrap;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Utilitário das migrações SQLite locais (bancos {@code data/sgi.db} antigos).
 * Detecta o dialeto fechando a {@link Connection} em try-with-resources.
 * Podem ser removidas quando todos os ambientes de desenvolvimento recriarem o arquivo SQLite.
 */
final class SqliteSchemaSupport {

    private SqliteSchemaSupport() {
    }

    static boolean isSqlite(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            return url != null && url.contains("sqlite");
        } catch (Exception e) {
            return false;
        }
    }
}
