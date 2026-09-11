package com.pucminas.sgi.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureJdbc;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Confere V1+V2 no PostgreSQL vazio com {@code ddl-auto=validate}.
 * Ative com {@code -Dsgi.testcontainers=true} e Docker disponível.
 */
@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration/postgresql",
        "spring.jpa.show-sql=false"
})
@Testcontainers(disabledWithoutDocker = true)
@EnabledIfSystemProperty(named = "sgi.testcontainers", matches = "true")
@ActiveProfiles("test")
@AutoConfigureJdbc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PostgresFlywaySchemaIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("sgi")
            .withUsername("sgi")
            .withPassword("sgi");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("Flyway aplica V1 e V2 e Hibernate valida o schema")
    void flywayAplicaBaselineETokenRevogado() {
        Integer applied = jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history", Integer.class);
        assertThat(applied).isEqualTo(2);
        Integer tokenRevogado = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'token_revogado'",
                Integer.class);
        assertThat(tokenRevogado).isEqualTo(1);
        Integer tarefas = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('tarefa','tarefa_checklist','tarefa_historico')",
                Integer.class);
        assertThat(tarefas).isEqualTo(3);
    }
}
