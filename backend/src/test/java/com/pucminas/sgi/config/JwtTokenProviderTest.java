package com.pucminas.sgi.config;

import com.pucminas.sgi.enums.Perfil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.assertThatNoException;

class JwtTokenProviderTest {

    private static final String SEGREDO_TESTE = "0123456789abcdef0123456789abcdef";

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n", "0123456789abcdef0123456789abcde"})
    void rejeitaSegredoAusenteBrancoOuCom31Bytes(String segredo) {
        JwtTokenProvider provider = criarProvider(segredo);

        assertThatIllegalStateException().isThrownBy(provider::validarSegredo)
                .withMessageContaining("32 bytes em UTF-8");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "0123456789abcdef0123456789abcde"})
    void segredoInvalidoImpedeInicializacaoDoBean(String segredo) {
        new ApplicationContextRunner()
                .withBean(JwtTokenProvider.class)
                .withPropertyValues("jwt.secret=" + segredo)
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseInstanceOf(IllegalStateException.class)
                        .hasRootCauseMessage("JWT_SECRET deve ter pelo menos 32 bytes em UTF-8."));
    }

    @ParameterizedTest
    @ValueSource(strings = {SEGREDO_TESTE, "áááááááááááááááá"})
    void aceitaSegredoComExatamente32BytesEmUtf8(String segredo) {
        assertThat(segredo.getBytes(StandardCharsets.UTF_8)).hasSize(32);
        JwtTokenProvider provider = criarProvider(segredo);

        assertThatNoException().isThrownBy(provider::validarSegredo);
        String token = provider.generatePortalToken(UUID.randomUUID(), "Cliente sintetico");
        assertThat(provider.getPortalClaims(token)).isNotNull();
    }

    @Test
    void inicializaBeanComSegredoValido() {
        new ApplicationContextRunner()
                .withBean(JwtTokenProvider.class)
                .withPropertyValues("jwt.secret=" + SEGREDO_TESTE)
                .run(context -> assertThat(context).hasNotFailed().hasSingleBean(JwtTokenProvider.class));
    }

    @Test
    void preservaClaimsDeEscritorioEApenasAceitaNoContextoDeEscritorio() {
        JwtTokenProvider provider = criarProvider(SEGREDO_TESTE);
        UUID usuarioId = UUID.randomUUID();

        String token = provider.generateToken(usuarioId, "login-sintetico", Perfil.FUNCIONARIO, "Usuario sintetico");

        JwtTokenProvider.JwtClaims claims = provider.getClaims(token);
        assertThat(claims.usuarioId()).isEqualTo(usuarioId);
        assertThat(claims.telefone()).isEqualTo("login-sintetico");
        assertThat(claims.perfil()).isEqualTo(Perfil.FUNCIONARIO);
        assertThat(claims.nome()).isEqualTo("Usuario sintetico");
        assertThat(claims.jti()).isNotBlank();
        assertThat(claims.expiration()).isNotNull();
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.getPortalClaims(token)).isNull();
        assertThat(provider.isPortalToken(token)).isFalse();
    }

    @Test
    void preservaClaimsDePortalEApenasAceitaNoContextoDePortal() {
        JwtTokenProvider provider = criarProvider(SEGREDO_TESTE);
        UUID clienteId = UUID.randomUUID();

        String token = provider.generatePortalToken(clienteId, "Cliente sintetico");

        assertThat(provider.getPortalClaims(token)).isEqualTo(
                new JwtTokenProvider.PortalJwtClaims(clienteId, "Cliente sintetico"));
        assertThat(provider.isPortalToken(token)).isTrue();
        assertThat(provider.getClaims(token)).isNull();
        assertThat(provider.validateToken(token)).isFalse();
    }

    @Test
    void rejeitaTokensDeEscritorioEPortalAssinadosComOutraChave() {
        JwtTokenProvider emissor = criarProvider("abcdef0123456789abcdef0123456789");
        JwtTokenProvider verificador = criarProvider(SEGREDO_TESTE);
        String tokenEscritorio = emissor.generateToken(UUID.randomUUID(), "teste", Perfil.FUNCIONARIO, "Teste");
        String tokenPortal = emissor.generatePortalToken(UUID.randomUUID(), "Teste");

        for (String token : new String[]{tokenEscritorio, tokenPortal}) {
            assertThat(verificador.getClaims(token)).isNull();
            assertThat(verificador.getPortalClaims(token)).isNull();
            assertThat(verificador.validateToken(token)).isFalse();
            assertThat(verificador.isPortalToken(token)).isFalse();
        }
    }

    private JwtTokenProvider criarProvider(String segredo) {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", segredo);
        ReflectionTestUtils.setField(provider, "jwtExpirationMs", 60_000L);
        ReflectionTestUtils.setField(provider, "jwtPortalExpirationMs", 60_000L);
        return provider;
    }
}
