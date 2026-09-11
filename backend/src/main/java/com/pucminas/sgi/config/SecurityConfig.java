package com.pucminas.sgi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.exception.ApiErrorWriter;
import org.springframework.http.HttpStatus;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuração de segurança: JWT escritório, portal do cliente e endpoints públicos.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PortalJwtAuthenticationFilter portalJwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          PortalJwtAuthenticationFilter portalJwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.portalJwtAuthenticationFilter = portalJwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        http
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, ex) -> ApiErrorWriter.write(objectMapper,
                                request, response, HttpStatus.UNAUTHORIZED, "Autenticação necessária."))
                        .accessDeniedHandler((request, response, ex) -> ApiErrorWriter.write(objectMapper,
                                request, response, HttpStatus.FORBIDDEN, "Acesso negado.")))
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(
                            "/api/auth/login",
                            "/api/auth/register",
                            "/api/auth/validar-login-recuperacao",
                            "/api/auth/redefinir-senha",
                            "/api/auth/recuperar-senha/solicitar",
                            "/api/auth/recuperar-senha/redefinir"
                    ).permitAll();
                    auth.requestMatchers(
                            "/api/portal/auth/login",
                            "/api/portal/auth/ativar",
                            "/api/portal/auth/recuperar-senha"
                    ).permitAll();
                    auth.requestMatchers("/api/sicoob/webhook/**").permitAll();
                    auth.requestMatchers("/health").permitAll();
                    auth.requestMatchers("/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                    auth.requestMatchers("/api/portal/**").authenticated();
                    auth.requestMatchers("/api/**").authenticated();
                    auth.anyRequest().authenticated();
                })
                .addFilterBefore(portalJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
