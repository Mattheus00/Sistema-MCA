package com.pucminas.sgi.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Tratamento global de exceções da API REST.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", message, request.getRequestURI());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateResourceException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.CONFLICT, "Conflict", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(EmailSendException.class)
    public ResponseEntity<ErrorResponse> handleEmailSend(EmailSendException ex, HttpServletRequest request) {
        log.error("Falha no envio de email: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(ExportacaoRelatorioException.class)
    public ResponseEntity<ErrorResponse> handleExportacao(ExportacaoRelatorioException ex, HttpServletRequest request) {
        log.error("Falha na exportação de relatório: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            String path = request.getRequestURI();
            if (path != null && path.contains("/api/portal/")) {
                message = "CPF/CNPJ ou senha inválidos.";
            } else {
                message = "Telefone ou senha inválidos.";
            }
        }
        return buildResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", message, request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = "ID inválido. Use o UUID da dívida (ex.: o campo id retornado na listagem de inadimplentes).";
        if (ex.getName() != null && ex.getName().equals("id") && request.getRequestURI() != null && request.getRequestURI().contains("inadimplentes")) {
            message = "ID inválido para inadimplência. Use o UUID da dívida (campo id da listagem).";
        }
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", message, request.getRequestURI());
    }

    @ExceptionHandler(CannotAcquireLockException.class)
    public ResponseEntity<ErrorResponse> handleDatabaseLock(CannotAcquireLockException ex, HttpServletRequest request) {
        log.warn("Banco ocupado em {}: {}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable",
                "O banco de dados está ocupado. Aguarde alguns segundos e tente novamente.", request.getRequestURI());
    }

    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccess(org.springframework.dao.DataAccessException ex,
                                                          HttpServletRequest request) {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String detail = root.getMessage() != null ? root.getMessage() : ex.getMessage();
        log.error("Erro de banco em {}: {}", request.getRequestURI(), detail, ex);
        String message = "Erro de banco de dados.";
        if (detail != null) {
            String d = detail.toLowerCase();
            if (d.contains("documento_cliente") || d.contains("does not exist") || d.contains("undefined table")) {
                message = "Schema incompleto (documentos). Reinicie o backend para aplicar as tabelas ou contate o suporte.";
            } else if (d.contains("not null") || d.contains("valor_comunicado")) {
                message = "Falha ao gravar notificação de e-mail (constraint). Tente novamente após atualizar o backend.";
            } else if (detail.length() <= 220) {
                message = "Erro de banco: " + detail;
            }
        }
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", message, request.getRequestURI());
    }

    @ExceptionHandler(org.springframework.web.multipart.support.MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingPart(
            org.springframework.web.multipart.support.MissingServletRequestPartException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request",
                "Arquivo PDF obrigatório (campo 'arquivo').", request.getRequestURI());
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUpload(
            org.springframework.web.multipart.MaxUploadSizeExceededException ex,
            HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request",
                "Arquivo PDF excede o tamanho máximo permitido.", request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Erro não tratado em {}: {}", request.getRequestURI(), ex.toString(), ex);
        String detail = ex.getMessage();
        String message = "Ocorreu um erro interno. Tente novamente ou contate o suporte.";
        if (detail != null && !detail.isBlank() && detail.length() <= 220
                && !(ex instanceof NullPointerException)) {
            message = message + " Detalhe: " + detail;
        } else if (ex instanceof NullPointerException) {
            message = message + " Detalhe: NullPointerException.";
        }
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                message, request.getRequestURI());
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String error, String message, String path) {
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(error)
                .message(message)
                .path(path)
                .build();
        return ResponseEntity.status(status).body(body);
    }
}
