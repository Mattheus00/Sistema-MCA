package com.pucminas.sgi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.dto.request.DividaDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.service.DividaService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DividaController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("DividaController")
class DividaControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DividaService dividaService;

    private static final UUID DIVIDA_ID = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private static final UUID CLIENTE_ID = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

    @Test
    @DisplayName("POST /api/dividas retorna 201")
    void registrar() throws Exception {
        DividaDTO request = DividaDTO.builder()
                .clienteId(CLIENTE_ID)
                .valorOriginal(new BigDecimal("10000"))
                .vencimento(LocalDate.now().plusDays(30))
                .descricao("Honorários")
                .build();
        DividaResponseDTO response = DividaResponseDTO.builder()
                .dividaId(DIVIDA_ID)
                .clienteId(CLIENTE_ID)
                .protocolo("DIV-20260531-ABC")
                .valorOriginal(new BigDecimal("100.00"))
                .valorDevedor(new BigDecimal("100.00"))
                .build();
        when(dividaService.registrarDivida(any(DividaDTO.class))).thenReturn(response);

        mockMvc.perform(post("/api/dividas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dividaId").value(DIVIDA_ID.toString()))
                .andExpect(jsonPath("$.protocolo").value("DIV-20260531-ABC"));
    }

    @Test
    @DisplayName("GET /api/dividas/{id} retorna 200")
    void consultar() throws Exception {
        when(dividaService.consultarDivida(DIVIDA_ID)).thenReturn(DividaResponseDTO.builder()
                .dividaId(DIVIDA_ID)
                .clienteId(CLIENTE_ID)
                .build());

        mockMvc.perform(get("/api/dividas/{id}", DIVIDA_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dividaId").value(DIVIDA_ID.toString()));
    }

    @Test
    @DisplayName("GET /api/dividas/{id} inexistente retorna 404")
    void consultar_naoEncontrada() throws Exception {
        when(dividaService.consultarDivida(DIVIDA_ID))
                .thenThrow(new ResourceNotFoundException("Dívida", DIVIDA_ID));

        mockMvc.perform(get("/api/dividas/{id}", DIVIDA_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/dividas lista paginada")
    void listar() throws Exception {
        Page<DividaResponseDTO> page = new PageImpl<>(List.of(
                DividaResponseDTO.builder().dividaId(DIVIDA_ID).build()));
        when(dividaService.listarDividas(eq(null), eq(null), eq(null), eq(null), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/dividas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].dividaId").value(DIVIDA_ID.toString()));
    }
}
