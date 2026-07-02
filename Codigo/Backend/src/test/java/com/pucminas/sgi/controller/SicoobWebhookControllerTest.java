package com.pucminas.sgi.controller;

import com.pucminas.sgi.exception.GlobalExceptionHandler;
import com.pucminas.sgi.service.SicoobWebhookService;
import com.pucminas.sgi.support.ControllerMvcTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SicoobWebhookController.class)
@Import(GlobalExceptionHandler.class)
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc(addFilters = false)
@DisplayName("SicoobWebhookController")
class SicoobWebhookControllerTest extends ControllerMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SicoobWebhookService webhookService;

    @Test
    @DisplayName("POST /api/sicoob/webhook/pix processa payload sem autenticação JWT")
    void webhookPix() throws Exception {
        String payload = "{\"pix\":[{\"txid\":\"abc123\",\"valor\":\"100.00\"}]}";
        doNothing().when(webhookService).validarSegredo(null);
        doNothing().when(webhookService).processarPixWebhook(payload);

        mockMvc.perform(post("/api/sicoob/webhook/pix")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        verify(webhookService).processarPixWebhook(payload);
    }

    @Test
    @DisplayName("POST /api/sicoob/webhook/pix/pix aceita rota alternativa do Sicoob")
    void webhookPixRotaAlternativa() throws Exception {
        String payload = "{}";
        doNothing().when(webhookService).validarSegredo(null);
        doNothing().when(webhookService).processarPixWebhook(payload);

        mockMvc.perform(post("/api/sicoob/webhook/pix/pix")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }
}
