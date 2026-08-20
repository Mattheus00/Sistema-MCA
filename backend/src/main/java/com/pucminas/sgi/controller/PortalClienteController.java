package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.PortalDividaDTO;
import com.pucminas.sgi.dto.response.PortalExtratoDTO;
import com.pucminas.sgi.dto.response.PortalMeResponseDTO;
import com.pucminas.sgi.dto.response.PortalResumoDTO;
import com.pucminas.sgi.service.PortalClienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portal")
@Tag(name = "Portal — Cliente", description = "Dívidas e resumo financeiro do cliente logado")
public class PortalClienteController {

    private final PortalClienteService portalClienteService;

    public PortalClienteController(PortalClienteService portalClienteService) {
        this.portalClienteService = portalClienteService;
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil do cliente logado")
    public ResponseEntity<PortalMeResponseDTO> me(Authentication authentication) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(portalClienteService.me(clienteId));
    }

    @GetMapping("/resumo")
    @Operation(summary = "Resumo financeiro do cliente")
    public ResponseEntity<PortalResumoDTO> resumo(Authentication authentication) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(portalClienteService.resumo(clienteId));
    }

    @GetMapping("/dividas")
    @Operation(summary = "Listar dívidas do cliente")
    public ResponseEntity<List<PortalDividaDTO>> listarDividas(
            Authentication authentication,
            @RequestParam(required = false, defaultValue = "abertas") String status) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(portalClienteService.listarDividas(clienteId, status));
    }

    @GetMapping("/dividas/{dividaId}")
    @Operation(summary = "Detalhe de uma dívida com pagamentos")
    public ResponseEntity<PortalDividaDTO> detalharDivida(
            Authentication authentication,
            @PathVariable UUID dividaId) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(portalClienteService.detalharDivida(clienteId, dividaId));
    }

    @GetMapping("/extrato")
    @Operation(summary = "Extrato simplificado do cliente")
    public ResponseEntity<PortalExtratoDTO> extrato(Authentication authentication) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(portalClienteService.extrato(clienteId));
    }
}
