package com.pucminas.sgi.controller;

import com.pucminas.sgi.entity.JurosConfig;
import com.pucminas.sgi.service.JurosConfigService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JurosConfigController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(StaffAuthorizationMvcTest.MethodSecurityTestConfig.class)
class StaffAuthorizationMvcTest extends ControllerMvcTestSupport {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {
    }

    @Autowired
    MockMvc mvc;

    @MockBean
    JurosConfigService jurosConfigService;

    @BeforeEach
    void stubJuros() {
        when(jurosConfigService.getAtual()).thenReturn(JurosConfig.builder()
                .multaDiaria(BigDecimal.ZERO)
                .capMultaPercentual(BigDecimal.ZERO)
                .jurosMensal(BigDecimal.ZERO)
                .build());
    }

    @Test
    @WithMockUser(roles = "FUNCIONARIO")
    void funcionarioPodeConsultarJuros() throws Exception {
        mvc.perform(get("/api/config/juros")).andExpect(status().isOk());
        verify(jurosConfigService).getAtual();
    }

    @Test
    @WithMockUser(roles = "FUNCIONARIO")
    void funcionarioNaoPodeAlterarJuros() throws Exception {
        mvc.perform(put("/api/config/juros")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"multaDiaria\":0,\"capMultaPercentual\":0,\"jurosMensal\":0}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(jurosConfigService);
    }

    @Test
    @WithMockUser(roles = "PROPRIETARIA")
    void proprietariaPodeAlterarJuros() throws Exception {
        when(jurosConfigService.atualizar(org.mockito.ArgumentMatchers.any()))
                .thenReturn(JurosConfig.builder()
                        .multaDiaria(BigDecimal.ZERO)
                        .capMultaPercentual(BigDecimal.ZERO)
                        .jurosMensal(BigDecimal.ZERO)
                        .build());
        mvc.perform(put("/api/config/juros")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"multaDiaria\":0,\"capMultaPercentual\":0,\"jurosMensal\":0}"))
                .andExpect(status().isOk());
        verify(jurosConfigService).atualizar(org.mockito.ArgumentMatchers.any());
    }
}
