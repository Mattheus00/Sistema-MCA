package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusPortalCredencial;
import com.pucminas.sgi.repository.ClientePortalCredencialRepository;
import com.pucminas.sgi.repository.ClienteRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import java.util.UUID;

/**
 * Valida JWT do portal do cliente em rotas /api/portal/** (exceto auth pública).
 */
@Component
public class PortalJwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final ClienteRepository clienteRepository;
    private final ClientePortalCredencialRepository credencialRepository;

    public PortalJwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                         ClienteRepository clienteRepository,
                                         ClientePortalCredencialRepository credencialRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.clienteRepository = clienteRepository;
        this.credencialRepository = credencialRepository;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/portal/") || path.startsWith("/api/portal/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String token = getTokenFromRequest(request);
        if (!StringUtils.hasText(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        JwtTokenProvider.PortalJwtClaims claims = jwtTokenProvider.getPortalClaims(token);
        if (claims == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        Cliente cliente = clienteRepository.findById(claims.clienteId()).orElse(null);
        if (cliente == null
                || cliente.getStatusCliente() != StatusCliente.ATIVO
                || Boolean.FALSE.equals(cliente.getPortalHabilitado())) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        var credencial = credencialRepository.findByCliente_ClienteId(claims.clienteId()).orElse(null);
        if (credencial == null || credencial.getStatus() != StatusPortalCredencial.ATIVO) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
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

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearer = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearer) && bearer.startsWith(BEARER_PREFIX)) {
            return bearer.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
