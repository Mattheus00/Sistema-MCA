package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.config.SicoobProperties;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.assertThatNoException;

class ProdStartupValidatorTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void exigeSegredoPresenteENaoBranco(String segredo) {
        ProdStartupValidator validator = criarValidator(segredo);

        assertThatIllegalStateException().isThrownBy(validator::validate)
                .withMessageContaining("JWT_SECRET");
    }

    @ParameterizedTest
    @ValueSource(strings = {"curto", "0123456789abcdef0123456789abcde", "ááááááááááááááá"})
    void rejeitaSegredoComMenosDe32Bytes(String segredo) {
        ProdStartupValidator validator = criarValidator(segredo);

        assertThatIllegalStateException().isThrownBy(validator::validate)
                .withMessageContaining("32 bytes em UTF-8");
    }

    @ParameterizedTest
    @ValueSource(strings = {"0123456789abcdef0123456789abcdef", "áááááááááááááááá"})
    void aceitaSegredoSinteticoDe32BytesIncluindoUnicode(String segredo) {
        assertThat(segredo.getBytes(StandardCharsets.UTF_8)).hasSize(32);
        ProdStartupValidator validator = criarValidator(segredo, true, "");

        assertThatNoException().isThrownBy(validator::validate);
    }

    @org.junit.jupiter.api.Test
    void webhookSemSegredoEmProducaoNaoImpedeOBoot() {
        ProdStartupValidator validator = criarValidator("0123456789abcdef0123456789abcdef", false, " ");
        assertThatNoException().isThrownBy(validator::validate);
    }

    @org.junit.jupiter.api.Test
    void webhookEmMockContinuaAceitandoSegredoVazio() {
        ProdStartupValidator validator = criarValidator("0123456789abcdef0123456789abcdef", true, "");
        assertThatNoException().isThrownBy(validator::validate);
    }

    private ProdStartupValidator criarValidator(String segredo) {
        return criarValidator(segredo, true, "");
    }

    private ProdStartupValidator criarValidator(String segredo, boolean mock, String webhookSecret) {
        SicoobProperties sicoob = new SicoobProperties();
        sicoob.setMock(mock);
        sicoob.setWebhookSecret(webhookSecret);
        ProdStartupValidator validator = new ProdStartupValidator(sicoob);
        ReflectionTestUtils.setField(validator, "jwtSecret", segredo);
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:postgresql://localhost/banco_sintetico");
        return validator;
    }
}
