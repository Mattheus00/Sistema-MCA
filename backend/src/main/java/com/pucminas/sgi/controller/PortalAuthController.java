package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.PortalAtivarRequestDTO;
import com.pucminas.sgi.dto.request.PortalLoginRequestDTO;
import com.pucminas.sgi.dto.request.PortalRecuperarSenhaRequestDTO;
import com.pucminas.sgi.dto.response.PortalLoginResponseDTO;
import com.pucminas.sgi.service.PortalAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portal/auth")
@Tag(name = "Portal — Autenticação", description = "Login e primeiro acesso do cliente")
public class PortalAuthController {

    private final PortalAuthService portalAuthService;

    public PortalAuthController(PortalAuthService portalAuthService) {
        this.portalAuthService = portalAuthService;
    }

    @PostMapping("/ativar")
    @Operation(summary = "Primeiro acesso — ativar portal com CPF/CNPJ, e-mail e senha")
    public ResponseEntity<PortalLoginResponseDTO> ativar(@Valid @RequestBody PortalAtivarRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(portalAuthService.ativar(dto));
    }

    @PostMapping("/login")
    @Operation(summary = "Login do cliente no portal")
    public ResponseEntity<PortalLoginResponseDTO> login(@Valid @RequestBody PortalLoginRequestDTO dto) {
        return ResponseEntity.ok(portalAuthService.login(dto));
    }

    @PostMapping("/recuperar-senha")
    @Operation(summary = "Redefinir senha do portal (CPF/CNPJ + e-mail cadastrado)")
    public ResponseEntity<Void> recuperarSenha(@Valid @RequestBody PortalRecuperarSenhaRequestDTO dto) {
        portalAuthService.recuperarSenha(dto);
        return ResponseEntity.noContent().build();
    }
}
