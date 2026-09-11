package com.pucminas.sgi.security;

import java.util.Arrays;
import java.util.stream.Stream;

/**
 * Rotas públicas da API. Fonte única para {@link SecurityConfig},
 * {@link RateLimitFilter} e exclusões do interceptor de staff.
 */
public final class PublicRoutes {

    private static final String[] AUTH = {
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/validar-login-recuperacao",
            "/api/auth/redefinir-senha",
            "/api/auth/recuperar-senha/solicitar",
            "/api/auth/recuperar-senha/redefinir",
            "/api/portal/auth/login",
            "/api/portal/auth/ativar",
            "/api/portal/auth/recuperar-senha"
    };

    public static final String[] PATTERNS = Stream.concat(
            Arrays.stream(AUTH),
            Stream.of(
                    "/api/sicoob/webhook/**",
                    "/health",
                    "/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
            )
    ).toArray(String[]::new);

    public static final String[] INTERCEPTOR_EXCLUSIONS = Stream.concat(
            Arrays.stream(PATTERNS),
            Stream.of("/api/portal/**")
    ).toArray(String[]::new);

    private PublicRoutes() {
    }

    /** Auth pública: rate limit. Health, Swagger e webhook ficam de fora. */
    public static boolean isRateLimitedAuth(String path) {
        if (path == null) {
            return false;
        }
        for (String auth : AUTH) {
            if (auth.equals(path)) {
                return true;
            }
        }
        return false;
    }
}
