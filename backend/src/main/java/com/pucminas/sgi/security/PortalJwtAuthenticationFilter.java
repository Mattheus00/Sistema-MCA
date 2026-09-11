package com.pucminas.sgi.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.exception.ApiErrorWriter;
import org.springframework.http.HttpStatus;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusPortalCredencial;
import com.pucminas.sgi.repository.ClientePortalCredencialRepository;
import com.pucminas.sgi.repository.ClienteRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Valida JWT do portal do cliente em rotas /api/portal/** (exceto auth pública).
 */
@Component
@RequiredArgsConstructor
public class PortalJwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final ClienteRepository clienteRepository;
    private final ClientePortalCredencialRepository credencialRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/portal/") || path.startsWith("/api/portal/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String token = JwtTokenProvider.extractBearerToken(request);
        if (!StringUtils.hasText(token)) {
            SecurityContextHolder.clearContext();
            ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
            return;
        }
        JwtTokenProvider.PortalJwtClaims claims = jwtTokenProvider.getPortalClaims(token);
        if (claims == null) {
            SecurityContextHolder.clearContext();
            ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
            return;
        }
        Cliente cliente = clienteRepository.findById(claims.clienteId()).orElse(null);
        if (cliente == null
                || cliente.getStatusCliente() != StatusCliente.ATIVO
                || Boolean.FALSE.equals(cliente.getPortalHabilitado())) {
            SecurityContextHolder.clearContext();
            ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
            return;
        }
        var credencial = credencialRepository.findByCliente_ClienteId(claims.clienteId()).orElse(null);
        if (credencial == null || credencial.getStatus() != StatusPortalCredencial.ATIVO) {
            SecurityContextHolder.clearContext();
            ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
            return;
        }
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                claims.clienteId(),
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PORTAL_CLIENTE"))
        );
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
        filterChain.doFilter(request, response);
    }
}
