package com.pucminas.sgi.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.exception.ApiErrorWriter;
import org.springframework.http.HttpStatus;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;
import java.io.IOException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

/**
 * Aplica restrições do perfil FUNCIONARIO nas rotas /api/** do escritório.
 */
@Component
public class StaffAccessInterceptor implements HandlerInterceptor {

    private final StaffAccessService staffAccessService;
    private final ObjectMapper objectMapper;

    public StaffAccessInterceptor(StaffAccessService staffAccessService, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.staffAccessService = staffAccessService;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws IOException {
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/") || path.startsWith("/api/portal/")) {
            return true;
        }
        if (path.startsWith("/api/sicoob/webhook")) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UUID usuarioId)) {
            return true;
        }

        try {
            staffAccessService.assertPodeAcessarRota(usuarioId, request.getMethod(), path);
            return true;
        } catch (AccessDeniedBusinessException ex) {
            ApiErrorWriter.write(objectMapper, request, response, HttpStatus.FORBIDDEN, ex.getMessage());
            return false;
        }
    }
}
