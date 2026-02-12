package com.pucminas.sgi.controller;

import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.dto.request.LoginDTO;
import com.pucminas.sgi.dto.response.LoginResponseDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação", description = "Login e dados do usuário autenticado")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(AuthService authService, JwtTokenProvider jwtTokenProvider) {
        this.authService = authService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Autentica por login (telefone ou usuário) e senha, retorna token JWT")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginDTO dto) {
        LoginResponseDTO response = authService.autenticar(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Invalida token (cliente deve descartar o token)")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Dados do usuário", description = "Retorna dados do usuário autenticado")
    public ResponseEntity<UsuarioResponseDTO> me(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        UsuarioResponseDTO dto = authService.dadosUsuario(usuarioId);
        return ResponseEntity.ok(dto);
    }
}
