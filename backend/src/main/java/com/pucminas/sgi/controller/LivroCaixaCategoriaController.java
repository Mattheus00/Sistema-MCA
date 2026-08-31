package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.LivroCaixaCategoriaRequestDTO;
import com.pucminas.sgi.dto.response.LivroCaixaCategoriaResponseDTO;
import com.pucminas.sgi.service.LivroCaixaCategoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/livro-caixa/categorias")
@Tag(name = "Livro Caixa - Categorias")
public class LivroCaixaCategoriaController {

    private final LivroCaixaCategoriaService categoriaService;

    public LivroCaixaCategoriaController(LivroCaixaCategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @GetMapping
    @Operation(summary = "Listar categorias")
    public ResponseEntity<List<LivroCaixaCategoriaResponseDTO>> listar(
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean incluirInativas) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(categoriaService.listar(usuarioId, incluirInativas));
    }

    @PostMapping
    @Operation(summary = "Criar categoria")
    public ResponseEntity<LivroCaixaCategoriaResponseDTO> criar(
            Authentication authentication,
            @Valid @RequestBody LivroCaixaCategoriaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.criar(usuarioId, dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar categoria")
    public ResponseEntity<LivroCaixaCategoriaResponseDTO> atualizar(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody LivroCaixaCategoriaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(categoriaService.atualizar(usuarioId, id, dto));
    }

    @PatchMapping("/{id}/desativar")
    @Operation(summary = "Desativar categoria (não exclui se houver movimentações)")
    public ResponseEntity<Void> desativar(Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        categoriaService.desativar(usuarioId, id);
        return ResponseEntity.noContent().build();
    }
}
