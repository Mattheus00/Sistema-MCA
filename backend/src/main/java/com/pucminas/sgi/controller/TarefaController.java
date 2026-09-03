package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.MoverTarefaRequestDTO;
import com.pucminas.sgi.dto.request.TarefaChecklistItemRequestDTO;
import com.pucminas.sgi.dto.request.TarefaRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.service.TarefaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tarefas")
@Tag(name = "Gestão de Tarefas", description = "Kanban, lista e calendário de tarefas do escritório")
public class TarefaController {

    private final TarefaService tarefaService;

    public TarefaController(TarefaService tarefaService) {
        this.tarefaService = tarefaService;
    }

    @GetMapping
    @Operation(summary = "Listar tarefas (paginado, com filtros)")
    public ResponseEntity<Page<TarefaResponseDTO>> listar(
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean visaoEquipe,
            @RequestParam(required = false) UUID responsavelId,
            @RequestParam(required = false) StatusTarefa status,
            @RequestParam(required = false) PrioridadeTarefa prioridade,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) Boolean apenasAtrasadas,
            @PageableDefault(size = 50, sort = "ordemKanban", direction = Sort.Direction.ASC) Pageable pageable) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.listar(
                usuarioId, responsavelId, status, prioridade, categoria, busca,
                dataInicio, dataFim, apenasAtrasadas, visaoEquipe, pageable));
    }

    @GetMapping("/kanban")
    @Operation(summary = "Listar tarefas para o board Kanban (ordenadas por coluna/ordem)")
    public ResponseEntity<List<TarefaResponseDTO>> kanban(
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean visaoEquipe,
            @RequestParam(required = false) UUID responsavelId,
            @RequestParam(required = false) StatusTarefa status,
            @RequestParam(required = false) PrioridadeTarefa prioridade,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String busca) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.listarKanban(
                usuarioId, responsavelId, visaoEquipe, status, prioridade, categoria, busca));
    }

    @GetMapping("/indicadores")
    @Operation(summary = "Indicadores compactos (aberto, andamento, atrasadas, concluídas na semana)")
    public ResponseEntity<TarefaIndicadoresDTO> indicadores(
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean visaoEquipe,
            @RequestParam(required = false) UUID responsavelId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.indicadores(usuarioId, responsavelId, visaoEquipe));
    }

    @GetMapping("/resumo-colaboradores")
    @Operation(summary = "Resumo por colaborador (somente gestores)")
    public ResponseEntity<List<TarefaResumoColaboradorDTO>> resumoColaboradores(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.resumoColaboradores(usuarioId));
    }

    @GetMapping("/responsaveis")
    @Operation(summary = "Opções de responsável para filtros/formulário")
    public ResponseEntity<List<TarefaResponsavelOptionDTO>> responsaveis(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.listarResponsaveis(usuarioId));
    }

    @GetMapping("/categorias")
    @Operation(summary = "Categorias/projetos já utilizados")
    public ResponseEntity<List<String>> categorias(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.listarCategorias(usuarioId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalhar tarefa (com checklist e histórico)")
    public ResponseEntity<TarefaResponseDTO> detalhar(Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.detalhar(usuarioId, id));
    }

    @PostMapping
    @Operation(summary = "Criar tarefa")
    public ResponseEntity<TarefaResponseDTO> criar(
            Authentication authentication,
            @Valid @RequestBody TarefaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(tarefaService.criar(usuarioId, dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar tarefa")
    public ResponseEntity<TarefaResponseDTO> atualizar(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody TarefaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.atualizar(usuarioId, id, dto));
    }

    @PatchMapping("/{id}/mover")
    @Operation(summary = "Mover tarefa no Kanban (status + ordem)")
    public ResponseEntity<TarefaResponseDTO> mover(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody MoverTarefaRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.mover(usuarioId, id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir tarefa")
    public ResponseEntity<Void> excluir(Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        tarefaService.excluir(usuarioId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/checklist")
    @Operation(summary = "Adicionar item ao checklist")
    public ResponseEntity<TarefaChecklistItemResponseDTO> adicionarChecklist(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody TarefaChecklistItemRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(tarefaService.adicionarChecklist(usuarioId, id, dto));
    }

    @PatchMapping("/{id}/checklist/{itemId}/toggle")
    @Operation(summary = "Alternar conclusão de item do checklist")
    public ResponseEntity<TarefaChecklistItemResponseDTO> toggleChecklist(
            Authentication authentication,
            @PathVariable UUID id,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(tarefaService.alternarChecklist(usuarioId, id, itemId));
    }

    @DeleteMapping("/{id}/checklist/{itemId}")
    @Operation(summary = "Remover item do checklist")
    public ResponseEntity<Void> removerChecklist(
            Authentication authentication,
            @PathVariable UUID id,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        tarefaService.removerChecklist(usuarioId, id, itemId);
        return ResponseEntity.noContent().build();
    }
}
