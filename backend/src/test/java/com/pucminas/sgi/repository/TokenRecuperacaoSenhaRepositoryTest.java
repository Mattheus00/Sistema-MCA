package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.*;
import com.pucminas.sgi.enums.Perfil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {
        // O post-processor legado interpreta esta propriedade como caminho de arquivo.
        // Hikari recebe a URL efetiva em memória, sem abrir qualquer banco em disco.
        "spring.datasource.url=jdbc:sqlite:target/test-placeholder.db",
        "spring.datasource.hikari.jdbc-url=jdbc:sqlite::memory:",
        "spring.datasource.hikari.maximum-pool-size=1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "logging.level.org.hibernate.SQL=WARN",
        "spring.flyway.enabled=false"
})
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TokenRecuperacaoSenhaRepositoryTest {
    @Autowired TokenRecuperacaoSenhaRepository tokens;
    @Autowired TestEntityManager em;
    @Test void consumoCondicionalNoBancoPermiteApenasUmUso() {
        em.getEntityManager().unwrap(org.hibernate.Session.class).doWork(connection ->
                assertThat(connection.getMetaData().getURL()).isEqualTo("jdbc:sqlite::memory:"));
        LocalDateTime agora = LocalDateTime.of(2026, 9, 11, 0, 0);
        Usuario usuario = em.persistAndFlush(Usuario.builder().telefone("usuario-sintetico")
                .nome("Teste").senha("hash-teste").perfil(Perfil.FUNCIONARIO).build());
        var token = tokens.saveAndFlush(TokenRecuperacaoSenha.builder().usuario(usuario)
                .tokenHash("a".repeat(64)).expiraEm(agora.plusMinutes(30)).build());
        assertThat(tokens.consumirSeValido(token.getId(), agora)).isEqualTo(1);
        assertThat(tokens.consumirSeValido(token.getId(), agora)).isZero();
        em.clear();
        assertThat(tokens.findByTokenHash("a".repeat(64)).orElseThrow().getUsadoEm()).isEqualTo(agora);
    }
    @Test void expiracaoNoLimiteNaoPodeSerConsumida() {
        em.getEntityManager().unwrap(org.hibernate.Session.class).doWork(connection ->
                assertThat(connection.getMetaData().getURL()).isEqualTo("jdbc:sqlite::memory:"));
        LocalDateTime agora = LocalDateTime.of(2026, 9, 11, 0, 0);
        Usuario usuario = em.persistAndFlush(Usuario.builder().telefone("outro-sintetico")
                .nome("Teste").senha("hash-teste").perfil(Perfil.FUNCIONARIO).build());
        var token = tokens.saveAndFlush(TokenRecuperacaoSenha.builder().usuario(usuario)
                .tokenHash("b".repeat(64)).expiraEm(agora).build());
        assertThat(tokens.consumirSeValido(token.getId(), agora)).isZero();
    }
}
