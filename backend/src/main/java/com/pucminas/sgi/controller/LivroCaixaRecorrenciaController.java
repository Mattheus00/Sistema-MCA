package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.LivroCaixaRecorrenciaRequestDTO;
import com.pucminas.sgi.dto.response.LivroCaixaRecorrenciaResponseDTO;
import com.pucminas.sgi.service.LivroCaixaRecorrenciaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.pucminas.sgi.security.StaffAuth;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/livro-caixa/recorrencias")
@PreAuthorize(StaffAuth.FINANCEIRO)
@Tag(name = "Livro Caixa - Recorrências")
public class LivroCaixaRecorrenciaController {

    private final LivroCaixaRecorrenciaService recorrenciaService;

    public LivroCaixaRecorrenciaController(LivroCaixaRecorrenciaService recorrenciaService) {
        this.recorrenciaService = recorrenciaService;
    }

    @GetMapping
    @Operation(summary = "Listar lançamentos recorrentes")
    public ResponseEntity<List<LivroCaixaRecorrenciaResponseDTO>> listar(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(recorrenciaService.listar(usuarioId));
    }

    @PostMapping
    @Operation(summary = "Criar lançamento recorrente")
    public ResponseEntity<LivroCaixaRecorrenciaResponseDTO> criar(
            Authentication authentication,
            @Valid @RequestBody LivroCaixaRecorrenciaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(recorrenciaService.criar(usuarioId, dto));
    }
}
