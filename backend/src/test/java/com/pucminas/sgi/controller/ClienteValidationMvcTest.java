package com.pucminas.sgi.controller;

import com.pucminas.sgi.service.ClienteService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClienteController.class)
@AutoConfigureMockMvc(addFilters = false)
class ClienteValidationMvcTest extends ControllerMvcTestSupport {
    @Autowired MockMvc mvc;
    @MockBean ClienteService clientes;
    String id = "11111111-1111-1111-1111-111111111111";
    @Test void patchSemNomeECpfContinuaAceito() throws Exception {
        mvc.perform(patch("/api/clientes/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"novo@example.com\"}"))
                .andExpect(status().isOk());
        verify(clientes).atualizarClientePartial(any(), any());
    }
    @Test void patchComCampoInvalidoRetorna400() throws Exception {
        mvc.perform(patch("/api/clientes/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"saldoDevedor\":-1}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(clientes);
    }
    @Test void cadastroAindaExigeNomeECpf() throws Exception {
        mvc.perform(post("/api/clientes").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(clientes);
    }
    @Test void putAindaExigeNomeECpf() throws Exception {
        mvc.perform(put("/api/clientes/" + id).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(clientes);
    }
}
