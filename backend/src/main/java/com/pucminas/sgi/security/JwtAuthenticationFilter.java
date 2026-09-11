package com.pucminas.sgi.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.exception.ApiErrorWriter;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.TokenRevogadoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
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

/**
 * Filtro que valida o token JWT em cada requisição e define o contexto de autenticação.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;
    private final TokenRevogadoRepository tokenRevogadoRepository;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path != null && path.startsWith("/api/portal/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = JwtTokenProvider.extractBearerToken(request);
            if (StringUtils.hasText(token)) {
                JwtTokenProvider.JwtClaims claims = jwtTokenProvider.getClaims(token);
                if (claims == null) {
                    SecurityContextHolder.clearContext();
                } else if (claims.jti() != null && tokenRevogadoRepository.existsById(claims.jti())) {
                    SecurityContextHolder.clearContext();
                    ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
                    return;
                } else {
                    Usuario usuario = usuarioRepository.findById(claims.usuarioId()).orElse(null);
                    if (usuario == null || usuario.getStatusUsuario() != StatusUsuario.ATIVO) {
                        SecurityContextHolder.clearContext();
                        ApiErrorWriter.write(objectMapper, request, response, HttpStatus.UNAUTHORIZED, "Autenticação inválida.");
                        return;
                    }
                    String role = "ROLE_" + claims.perfil().name();
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            claims.usuarioId(),
                            null,
                            Collections.singletonList(new SimpleGrantedAuthority(role))
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            log.warn("Falha na autenticação JWT: {}", e.getClass().getSimpleName());
        }
        filterChain.doFilter(request, response);
    }
}
