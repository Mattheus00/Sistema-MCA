package com.pucminas.sgi.exception;

import com.pucminas.sgi.support.ControllerMvcTestSupport;
import jakarta.validation.*;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.*;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GlobalExceptionHandlerMvcTest.ProbeController.class)
@Import(GlobalExceptionHandlerMvcTest.ProbeController.class)
@AutoConfigureMockMvc(addFilters = false)
class GlobalExceptionHandlerMvcTest extends ControllerMvcTestSupport {
    @Autowired MockMvc mvc;
    @ParameterizedTest
    @CsvSource({"status,403", "spring,409", "conflito,409", "dominio,403", "acesso,403", "auth,401", "constraint,400"})
    void excecoesMantemStatusECorpoPadrao(String tipo, int statusEsperado) throws Exception {
        mvc.perform(get("/probe/erro/" + tipo)).andExpect(status().is(statusEsperado))
                .andExpect(jsonPath("$.status").value(statusEsperado)).andExpect(jsonPath("$.timestamp").isString())
                .andExpect(jsonPath("$.error").isString()).andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/probe/erro/" + tipo));
    }
    @ParameterizedTest @CsvSource({"generic", "data"})
    void erroInternoNaoExibeDetalhes(String tipo) throws Exception {
        mvc.perform(get("/probe/erro/" + tipo)).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message", matchesPattern("Ocorreu um erro interno. Código: [0-9a-f-]{36}")))
                .andExpect(content().string(not(containsString("segredo-do-banco"))));
    }
    @Test void jsonMalformadoRetorna400() throws Exception {
        mvc.perform(post("/probe/body").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Corpo da requisição inválido."));
    }
    @Test void parametroObrigatorioMencionaCampo() throws Exception {
        mvc.perform(get("/probe/param")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("nome")));
    }
    @Test void recursoInexistenteRetorna404() throws Exception {
        mvc.perform(get("/recurso-que-nao-existe")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404)).andExpect(jsonPath("$.path").value("/recurso-que-nao-existe"));
    }
    @Test void metodoNaoPermitidoRetorna405() throws Exception {
        mvc.perform(post("/probe/param")).andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.status").value(405));
    }
    @Test void enumListaValoresDoTipoCorreto() throws Exception {
        mvc.perform(get("/probe/enum").param("status", "invalido")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("PRIMEIRO, SEGUNDO")))
                .andExpect(jsonPath("$.message", not(containsString("ARQUIVADO"))));
    }
    @Test void violacaoIndicaCampo() throws Exception {
        mvc.perform(get("/probe/erro/constraint")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("nome")));
    }
    enum Opcao { PRIMEIRO, SEGUNDO }
    record Body(@NotBlank(message = "Nome é obrigatório") String nome) {}
    @RestController
    static class ProbeController {
        @Autowired Validator validator;
        @GetMapping("/probe/erro/{tipo}") void erro(@PathVariable String tipo) {
            switch (tipo) {
                case "status" -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permissão negada");
                case "spring" -> throw new ErrorResponseException(HttpStatus.CONFLICT);
                case "conflito" -> throw new ConflictException("Lote já está em envio.");
                case "dominio" -> throw new AccessDeniedBusinessException("Acesso negado pelo domínio");
                case "acesso" -> throw new AccessDeniedException("negado");
                case "auth" -> throw new AuthenticationCredentialsNotFoundException("negado");
                case "constraint" -> throw new ConstraintViolationException(validator.validate(new Body("")));
                case "data" -> throw new DataAccessResourceFailureException("segredo-do-banco");
                default -> throw new IllegalStateException("segredo-do-banco");
            }
        }
        @PostMapping("/probe/body") void body(@Valid @RequestBody Body body) {}
        @GetMapping("/probe/param") String param(@RequestParam String nome) { return nome; }
        @GetMapping("/probe/enum") Opcao opcao(@RequestParam Opcao status) { return status; }
    }
}
