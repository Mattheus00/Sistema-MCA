package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.ContaFinanceiraRequestDTO;
import com.pucminas.sgi.dto.response.ContaFinanceiraResponseDTO;
import com.pucminas.sgi.service.ContaFinanceiraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import com.pucminas.sgi.security.StaffAuth;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/livro-caixa/contas")
@PreAuthorize(StaffAuth.FINANCEIRO)
@Tag(name = "Livro Caixa - Contas")
@RequiredArgsConstructor
public class ContaFinanceiraController {

    private final ContaFinanceiraService contaService;


    @GetMapping
    @Operation(summary = "Listar contas financeiras")
    public ResponseEntity<List<ContaFinanceiraResponseDTO>> listar(
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean incluirInativas) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(contaService.listar(usuarioId, incluirInativas));
    }

    @PostMapping
    @Operation(summary = "Criar conta financeira")
    public ResponseEntity<ContaFinanceiraResponseDTO> criar(
            Authentication authentication,
            @Valid @RequestBody ContaFinanceiraRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(contaService.criar(usuarioId, dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar conta financeira")
    public ResponseEntity<ContaFinanceiraResponseDTO> atualizar(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody ContaFinanceiraRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(contaService.atualizar(usuarioId, id, dto));
    }

    @PatchMapping("/{id}/desativar")
    @Operation(summary = "Desativar conta financeira")
    public ResponseEntity<Void> desativar(Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        contaService.desativar(usuarioId, id);
        return ResponseEntity.noContent().build();
    }
}
