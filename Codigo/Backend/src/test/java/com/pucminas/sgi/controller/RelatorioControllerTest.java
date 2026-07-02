package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.RelatorioInadimplentesDTO;
import com.pucminas.sgi.dto.response.ResumoRelatorioDTO;
import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.service.RelatorioService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RelatorioController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("RelatorioController")
class RelatorioControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RelatorioService relatorioService;

    @Test
    @DisplayName("GET /api/relatorios/resumo retorna dashboard")
    void obterResumoDashboard() throws Exception {
        when(relatorioService.gerarResumo(30)).thenReturn(ResumoRelatorioDTO.builder()
                .totalClientes(10)
                .totalDividas(5)
                .totalEmAberto(new BigDecimal("1000.00"))
                .totalPago(new BigDecimal("500.00"))
                .build());

        mockMvc.perform(get("/api/relatorios/resumo").param("dias", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClientes").value(10))
                .andExpect(jsonPath("$.totalDividas").value(5));
    }

    @Test
    @DisplayName("GET /api/relatorios/inadimplentes retorna relatório")
    void inadimplentes() throws Exception {
        when(relatorioService.gerarRelatorioInadimplentes(any(), any(), eq(null)))
                .thenReturn(RelatorioInadimplentesDTO.builder()
                        .totalClientesInadimplentes(2)
                        .valorTotalInadimplente(new BigDecimal("200.00"))
                        .build());

        mockMvc.perform(get("/api/relatorios/inadimplentes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClientesInadimplentes").value(2));
    }

    @Test
    @DisplayName("GET /api/relatorios/exportar/pdf retorna arquivo")
    void exportarPdf() throws Exception {
        when(relatorioService.exportarRelatorioPDF(eq("inadimplentes"), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new ByteArrayResource(new byte[]{1, 2, 3}));

        mockMvc.perform(get("/api/relatorios/exportar/pdf")
                        .param("relatorio", "inadimplentes"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".pdf")));
    }

    @Test
    @DisplayName("GET /api/relatorios/exportar/tipo-invalido retorna 400")
    void exportarTipoInvalido() throws Exception {
        mockMvc.perform(get("/api/relatorios/exportar/txt"))
                .andExpect(status().isBadRequest());
    }
}
