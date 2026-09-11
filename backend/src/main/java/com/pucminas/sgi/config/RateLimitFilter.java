package com.pucminas.sgi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.exception.ApiErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limit em memória para endpoints públicos sensíveis.
 * Usa {@code request.getRemoteAddr()} (Render: {@code server.forward-headers-strategy=framework}).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int LIMPEZA_A_CADA = 64;

    private final ObjectMapper objectMapper;
    private final int maxRequestsPerMinute;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final AtomicInteger requisicoes = new AtomicInteger();

    public RateLimitFilter(ObjectMapper objectMapper,
                           @Value("${sgi.rate-limit.requests-per-minute:20}") int maxRequestsPerMinute) {
        this.objectMapper = objectMapper;
        this.maxRequestsPerMinute = Math.max(1, maxRequestsPerMinute);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        return !(path.equals("/api/auth/login")
                || path.equals("/api/auth/register")
                || path.equals("/api/auth/validar-login-recuperacao")
                || path.equals("/api/auth/redefinir-senha")
                || path.equals("/api/auth/recuperar-senha/solicitar")
                || path.equals("/api/auth/recuperar-senha/redefinir")
                || path.equals("/api/portal/auth/login")
                || path.equals("/api/portal/auth/ativar")
                || path.equals("/api/portal/auth/recuperar-senha"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = clientKey(request) + "|" + request.getRequestURI();
        long now = Instant.now().toEpochMilli();
        Deque<Long> timestamps = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequestsPerMinute) {
                ApiErrorWriter.write(objectMapper, request, response, HttpStatus.TOO_MANY_REQUESTS,
                        "Muitas tentativas. Aguarde um minuto e tente novamente.");
                return;
            }
            timestamps.addLast(now);
        }
        if (requisicoes.incrementAndGet() % LIMPEZA_A_CADA == 0) {
            limparExpirados(now);
        }
        filterChain.doFilter(request, response);
    }

    private void limparExpirados(long now) {
        Iterator<Map.Entry<String, Deque<Long>>> it = hits.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Deque<Long>> entry = it.next();
            Deque<Long> timestamps = entry.getValue();
            synchronized (timestamps) {
                while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                    timestamps.pollFirst();
                }
                if (timestamps.isEmpty()) {
                    it.remove();
                }
            }
        }
    }

    private String clientKey(HttpServletRequest request) {
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
