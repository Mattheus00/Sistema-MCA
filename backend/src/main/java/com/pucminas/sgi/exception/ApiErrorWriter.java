package com.pucminas.sgi.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.time.LocalDateTime;

/** Serialização comum para filtros que executam antes dos controllers. */
public final class ApiErrorWriter {
    private ApiErrorWriter() {}
    public static void write(ObjectMapper mapper, HttpServletRequest request,
                             HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), ErrorResponse.builder()
                .timestamp(LocalDateTime.now()).status(status.value()).error(status.getReasonPhrase())
                .message(message).path(request.getRequestURI()).build());
    }
}
