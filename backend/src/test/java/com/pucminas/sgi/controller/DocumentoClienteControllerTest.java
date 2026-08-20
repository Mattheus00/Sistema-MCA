package com.pucminas.sgi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.dto.response.PortalDocumentoDTO;
import com.pucminas.sgi.dto.response.ResumoDocumentosClientesDTO;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.service.DocumentoClienteService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DocumentoClienteController.class)
@Import(GlobalExceptionHandler.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("DocumentoClienteController")
class DocumentoClienteControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentoClienteService documentoClienteService;

    private static final UUID DOCUMENTO_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CLIENTE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    @DisplayName("GET /api/documentos-clientes/resumo retorna contadores")
    void resumo() throws Exception {
        when(documentoClienteService.resumo()).thenReturn(ResumoDocumentosClientesDTO.builder()
                .recebidos(2)
                .emAnalise(1)
                .arquivados(5)
                .build());

        mockMvc.perform(get("/api/documentos-clientes/resumo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recebidos").value(2))
                .andExpect(jsonPath("$.emAnalise").value(1))
                .andExpect(jsonPath("$.arquivados").value(5));
    }

    @Test
    @DisplayName("GET /api/documentos-clientes retorna lista paginada")
    void listarTodos() throws Exception {
        PortalDocumentoDTO doc = PortalDocumentoDTO.builder()
                .documentoId(DOCUMENTO_ID)
                .clienteId(CLIENTE_ID)
                .clienteNome("Matheus")
                .clienteCodigo("101")
                .tipo(TipoDocumentoCliente.COMPROVANTE)
                .status(StatusDocumentoCliente.RECEBIDO)
                .nomeOriginal("comprovante.pdf")
                .contentType("application/pdf")
                .tamanhoBytes(1024)
                .enviadoEm(LocalDateTime.now())
                .build();
        when(documentoClienteService.listarStaff(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(doc)));

        mockMvc.perform(get("/api/documentos-clientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].clienteNome").value("Matheus"))
                .andExpect(jsonPath("$.content[0].documentoId").value(DOCUMENTO_ID.toString()));
    }
}
