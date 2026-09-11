package com.pucminas.sgi.service;

import com.pucminas.sgi.config.SicoobProperties;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class SicoobWebhookServiceTest {

    @Test
    void rejeitaWebhookSemSegredoQuandoNaoEstaEmMock() {
        SicoobProperties properties = new SicoobProperties();
        properties.setMock(false);
        properties.setWebhookSecret(" ");
        SicoobWebhookService service = new SicoobWebhookService(
                properties,
                mock(com.pucminas.sgi.repository.CobrancaSicoobRepository.class),
                mock(PagamentoService.class),
                mock(com.fasterxml.jackson.databind.ObjectMapper.class));

        assertThatThrownBy(() -> service.validarSegredo("qualquer"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void mockContinuaAceitandoSemSegredo() {
        SicoobProperties properties = new SicoobProperties();
        properties.setMock(true);
        properties.setWebhookSecret("");
        SicoobWebhookService service = new SicoobWebhookService(
                properties,
                mock(com.pucminas.sgi.repository.CobrancaSicoobRepository.class),
                mock(PagamentoService.class),
                mock(com.fasterxml.jackson.databind.ObjectMapper.class));

        service.validarSegredo(null);
    }
}
