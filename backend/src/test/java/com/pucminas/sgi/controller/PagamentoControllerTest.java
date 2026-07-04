package com.pucminas.sgi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.dto.response.PagamentoResponseDTO;
import com.pucminas.sgi.dto.response.ReciboDTO;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.service.PagamentoService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PagamentoController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("PagamentoController")
class PagamentoControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PagamentoService pagamentoService;

    private static final UUID DIVIDA_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PAGAMENTO_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    @DisplayName("POST /api/pagamentos retorna 201 com recibo")
    void registrar() throws Exception {
        PagamentoDTO request = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("5000"))
                .dataPagamento(LocalDate.of(2026, 5, 31))
                .metodoPagamento("PIX")
                .build();
        ReciboDTO recibo = ReciboDTO.builder()
                .pagamentoId(PAGAMENTO_ID)
                .dividaId(DIVIDA_ID)
                .protocoloDivida("DIV-1")
                .valorPago(new BigDecimal("50.00"))
                .build();
        when(pagamentoService.registrarPagamento(any(PagamentoDTO.class))).thenReturn(recibo);

        mockMvc.perform(post("/api/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pagamentoId").value(PAGAMENTO_ID.toString()))
                .andExpect(jsonPath("$.valorPago").value(50.00));
    }

    @Test
    @DisplayName("POST /api/pagamentos com valor inválido retorna 400")
    void registrar_validacao() throws Exception {
        PagamentoDTO request = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(BigDecimal.ZERO)
                .dataPagamento(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/pagamentos regra de negócio retorna 422")
    void registrar_regraNegocio() throws Exception {
        PagamentoDTO request = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("999999"))
                .dataPagamento(LocalDate.now())
                .build();
        when(pagamentoService.registrarPagamento(any()))
                .thenThrow(new BusinessRuleException("Valor pago não pode ser maior que o saldo devedor da dívida."));

        mockMvc.perform(post("/api/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("GET /api/pagamentos/divida/{id} lista pagamentos")
    void listarPorDivida() throws Exception {
        when(pagamentoService.listarPagamentosPorDivida(DIVIDA_ID)).thenReturn(List.of(
                PagamentoResponseDTO.builder()
                        .pagamentoId(PAGAMENTO_ID)
                        .dividaId(DIVIDA_ID)
                        .valorPago(new BigDecimal("50.00"))
                        .build()));

        mockMvc.perform(get("/api/pagamentos/divida/{dividaId}", DIVIDA_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].pagamentoId").value(PAGAMENTO_ID.toString()));
    }
}
