package com.pucminas.sgi.config;

import com.pucminas.sgi.enums.Perfil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Geração e validação de tokens JWT (escritório e portal do cliente).
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    public static final String CLAIM_TIPO_AUTH = "tipoAuth";
    public static final String TIPO_AUTH_PORTAL = "PORTAL_CLIENTE";
    public static final String CLAIM_CLIENTE_ID = "clienteId";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    @Value("${jwt.portal.expiration:604800000}")
    private long jwtPortalExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            keyBytes = java.util.Arrays.copyOf(keyBytes, 32);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UUID usuarioId, String telefone, Perfil perfil, String nome) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);
        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim("telefone", telefone)
                .claim("perfil", perfil.name())
                .claim("nome", nome)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    public String generatePortalToken(UUID clienteId, String nome) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtPortalExpirationMs);
        return Jwts.builder()
                .subject(clienteId.toString())
                .claim(CLAIM_TIPO_AUTH, TIPO_AUTH_PORTAL)
                .claim(CLAIM_CLIENTE_ID, clienteId.toString())
                .claim("nome", nome)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    public JwtClaims getClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (TIPO_AUTH_PORTAL.equals(claims.get(CLAIM_TIPO_AUTH, String.class))) {
                return null;
            }
            return new JwtClaims(
                    UUID.fromString(claims.getSubject()),
                    claims.get("telefone", String.class),
                    Perfil.valueOf(claims.get("perfil", String.class)),
                    claims.get("nome", String.class)
            );
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token inválido: {}", e.getMessage());
            return null;
        }
    }

    public PortalJwtClaims getPortalClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!TIPO_AUTH_PORTAL.equals(claims.get(CLAIM_TIPO_AUTH, String.class))) {
                return null;
            }
            UUID clienteId = UUID.fromString(claims.get(CLAIM_CLIENTE_ID, String.class));
            return new PortalJwtClaims(clienteId, claims.get("nome", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token portal inválido: {}", e.getMessage());
            return null;
        }
    }

    public boolean isPortalToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return TIPO_AUTH_PORTAL.equals(claims.get(CLAIM_TIPO_AUTH, String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateToken(String token) {
        return getClaims(token) != null;
    }

    public record JwtClaims(UUID usuarioId, String telefone, Perfil perfil, String nome) {}

    public record PortalJwtClaims(UUID clienteId, String nome) {}
}
