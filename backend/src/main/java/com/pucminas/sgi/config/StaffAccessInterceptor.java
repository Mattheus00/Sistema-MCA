package com.pucminas.sgi.config;

import com.pucminas.sgi.service.StaffAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

/**
 * Aplica restrições do perfil FUNCIONARIO nas rotas /api/** do escritório.
 */
@Component
public class StaffAccessInterceptor implements HandlerInterceptor {

    private final StaffAccessService staffAccessService;

    public StaffAccessInterceptor(StaffAccessService staffAccessService) {
        this.staffAccessService = staffAccessService;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
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
        } catch (ResponseStatusException ex) {
            response.setStatus(ex.getStatusCode().value());
            response.setContentType("application/json;charset=UTF-8");
            try {
                String msg = ex.getReason() != null ? ex.getReason() : "Acesso negado.";
                response.getWriter().write("{\"message\":\"" + msg.replace("\"", "'") + "\"}");
            } catch (Exception ignored) {
                // status já definido
            }
            return false;
        }
    }
}
