package com.pucminas.sgi.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    @InjectMocks
    private GlobalExceptionHandler handler;

    @Mock
    private HttpServletRequest request;

    @Test
    @DisplayName("ExportacaoRelatorioException retorna 500")
    void handleExportacao() {
        when(request.getRequestURI()).thenReturn("/api/relatorios/exportar/pdf");
        ExportacaoRelatorioException ex = new ExportacaoRelatorioException("Falha PDF", new RuntimeException("erro"));

        ResponseEntity<ErrorResponse> response = handler.handleExportacao(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("Falha PDF", response.getBody().getMessage());
    }

    @Test
    @DisplayName("BusinessRuleException retorna 422")
    void handleBusinessRule() {
        when(request.getRequestURI()).thenReturn("/api/pagamentos");

        ResponseEntity<ErrorResponse> response = handler.handleBusinessRule(
                new BusinessRuleException("Regra violada"), request);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
    }

    @Test
    @DisplayName("BadCredentials no portal preserva mensagem da exceção")
    void handleBadCredentialsPortal() {
        when(request.getRequestURI()).thenReturn("/api/portal/auth/login");

        ResponseEntity<ErrorResponse> response = handler.handleBadCredentials(
                new BadCredentialsException("CPF/CNPJ ou senha inválidos."), request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("CPF/CNPJ ou senha inválidos.", response.getBody().getMessage());
    }

    @Test
    @DisplayName("BadCredentials no escritório usa mensagem padrão de telefone")
    void handleBadCredentialsEscritorio() {
        when(request.getRequestURI()).thenReturn("/api/auth/login");

        ResponseEntity<ErrorResponse> response = handler.handleBadCredentials(
                new BadCredentialsException(""), request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Telefone ou senha inválidos.", response.getBody().getMessage());
    }
}
