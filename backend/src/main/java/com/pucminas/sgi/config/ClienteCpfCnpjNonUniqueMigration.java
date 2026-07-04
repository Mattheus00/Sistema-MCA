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
import java.util.regex.Pattern;

/**
 * Remove unicidade embutida em {@code cpf_cnpj} no SQLite (coluna {@code UNIQUE} na tabela).
 * Apenas dropar o índice não basta — é necessário recriar a tabela {@code cliente}.
 */
@Component
@Order(1)
public class ClienteCpfCnpjNonUniqueMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClienteCpfCnpjNonUniqueMigration.class);
    private static final Pattern CPF_CNPJ_UNIQUE = Pattern.compile(
            "cpf_cnpj\\s+varchar\\([^)]*\\)\\s+not\\s+null\\s+unique",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final DataSource dataSource;

    public ClienteCpfCnpjNonUniqueMigration(DataSource dataSource) {
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
            log.trace("Nao e SQLite, migracao cpf_cnpj ignorada.");
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> cols = jdbc.queryForList("PRAGMA table_info(cliente)");
        if (cols.isEmpty()) {
            return;
        }

        String ddl = jdbc.queryForObject(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='cliente'",
                String.class);
        if (ddl == null || !CPF_CNPJ_UNIQUE.matcher(ddl).find()) {
            log.debug("cliente.cpf_cnpj ja permite duplicatas (migracao nao necessaria).");
            return;
        }

        log.info("Recriando tabela cliente para remover UNIQUE de cpf_cnpj...");

        jdbc.execute("PRAGMA foreign_keys=OFF");
        try {
            jdbc.execute("BEGIN IMMEDIATE TRANSACTION");
            jdbc.execute("""
                    CREATE TABLE cliente__cpf_migration (
                        cliente_id blob not null,
                        atualizado_em timestamp,
                        cpf_cnpj varchar(255) not null,
                        criado_em timestamp not null,
                        email varchar(255),
                        endereco varchar(255),
                        nome varchar(255) not null,
                        saldo_devedor numeric(19,0) not null,
                        status_cliente varchar(255) not null,
                        telefone varchar(255),
                        celular varchar(255),
                        codigo varchar(255),
                        primary key (cliente_id)
                    )
                    """);
            jdbc.execute("""
                    INSERT INTO cliente__cpf_migration (
                        cliente_id, atualizado_em, cpf_cnpj, criado_em, email, endereco, nome,
                        saldo_devedor, status_cliente, telefone, celular, codigo
                    )
                    SELECT
                        cliente_id, atualizado_em, cpf_cnpj, criado_em, email, endereco, nome,
                        saldo_devedor, status_cliente, telefone, celular, codigo
                    FROM cliente
                    """);
            jdbc.execute("DROP TABLE cliente");
            jdbc.execute("ALTER TABLE cliente__cpf_migration RENAME TO cliente");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_cliente_cpf_cnpj ON cliente(cpf_cnpj)");
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_codigo ON cliente(codigo)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_cliente_status ON cliente(status_cliente)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_cliente_email ON cliente(email)");
            jdbc.execute("COMMIT");
            log.info("Migracao cliente.cpf_cnpj (nao unico) concluida.");
        } catch (RuntimeException e) {
            jdbc.execute("ROLLBACK");
            throw e;
        } finally {
            jdbc.execute("PRAGMA foreign_keys=ON");
        }
    }
}
