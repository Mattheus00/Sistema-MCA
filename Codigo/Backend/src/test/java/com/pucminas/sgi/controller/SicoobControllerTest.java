package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.CobrancaSicoobResponseDTO;
import com.pucminas.sgi.dto.response.SicoobStatusResponseDTO;
import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.enums.TipoCobrancaSicoob;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.service.SicoobCobrancaService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SicoobController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("SicoobController")
class SicoobControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SicoobCobrancaService sicoobCobrancaService;

    private static final UUID DIVIDA_ID = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");
    private static final UUID COBRANCA_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Test
    @DisplayName("GET /api/sicoob/status retorna integração mock")
    void obterStatusIntegracao() throws Exception {
        when(sicoobCobrancaService.status()).thenReturn(SicoobStatusResponseDTO.builder()
                .enabled(true)
                .mock(true)
                .configuredForApi(false)
                .mensagem("Modo mock")
                .build());

        mockMvc.perform(get("/api/sicoob/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.mock").value(true));
    }

    @Test
    @DisplayName("POST /api/sicoob/dividas/{id}/pix retorna 201")
    void emitirPix() throws Exception {
        when(sicoobCobrancaService.emitirPix(DIVIDA_ID)).thenReturn(CobrancaSicoobResponseDTO.builder()
                .cobrancaId(COBRANCA_ID)
                .dividaId(DIVIDA_ID)
                .tipo(TipoCobrancaSicoob.PIX)
                .status(StatusCobrancaSicoob.PENDENTE)
                .valorCentavos(new BigDecimal("10000"))
                .pixCopiaECola("000201MOCK")
                .build());

        mockMvc.perform(post("/api/sicoob/dividas/{dividaId}/pix", DIVIDA_ID))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("PIX"))
                .andExpect(jsonPath("$.pixCopiaECola").value("000201MOCK"));
    }

    @Test
    @DisplayName("POST /api/sicoob/dividas/{id}/pix sem saldo retorna 422")
    void emitirPix_regraNegocio() throws Exception {
        when(sicoobCobrancaService.emitirPix(DIVIDA_ID))
                .thenThrow(new BusinessRuleException("Dívida sem saldo devedor para gerar cobrança."));

        mockMvc.perform(post("/api/sicoob/dividas/{dividaId}/pix", DIVIDA_ID))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("GET /api/sicoob/dividas/{id}/cobrancas lista cobranças")
    void listarCobrancas() throws Exception {
        when(sicoobCobrancaService.listarPorDivida(DIVIDA_ID)).thenReturn(List.of(
                CobrancaSicoobResponseDTO.builder()
                        .cobrancaId(COBRANCA_ID)
                        .dividaId(DIVIDA_ID)
                        .tipo(TipoCobrancaSicoob.BOLETO)
                        .status(StatusCobrancaSicoob.PENDENTE)
                        .build()));

        mockMvc.perform(get("/api/sicoob/dividas/{dividaId}/cobrancas", DIVIDA_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipo").value("BOLETO"));
    }
}
