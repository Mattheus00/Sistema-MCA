package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.InadimplenciaPayloadDTO;
import com.pucminas.sgi.dto.request.InadimplenciaStatusDTO;
import com.pucminas.sgi.dto.response.InadimplenciaResponseDTO;
import com.pucminas.sgi.service.InadimplenciaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.pucminas.sgi.security.StaffAuth;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * API de inadimplências (contrato frontend): listagem, criação e confirmação de pagamento.
 */
@RestController
@RequestMapping("/api/inadimplentes")
@PreAuthorize(StaffAuth.STAFF)
@Tag(name = "Inadimplentes", description = "Listagem e registro de inadimplências (dívidas)")
@Slf4j
@RequiredArgsConstructor
public class InadimplenciaController {
    private final InadimplenciaService inadimplenciaService;


    @GetMapping
    @Operation(summary = "Listar inadimplências")
    public ResponseEntity<Object> listar(@PageableDefault(size = 50) Pageable pageable,
                                        @RequestParam(required = false) Boolean paginado) {
        if (Boolean.TRUE.equals(paginado)) {
            Page<InadimplenciaResponseDTO> page = inadimplenciaService.listar(pageable);
            return ResponseEntity.ok(page);
        }
        List<InadimplenciaResponseDTO> list = inadimplenciaService.listarTodas();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @Operation(summary = "Registrar inadimplência (nova dívida)")
    public ResponseEntity<InadimplenciaResponseDTO> criar(@Valid @RequestBody InadimplenciaPayloadDTO payload) {
        InadimplenciaResponseDTO response = inadimplenciaService.criar(payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Confirmar pagamento (status: Pago) ou retornar inadimplência")
    public ResponseEntity<InadimplenciaResponseDTO> atualizarStatus(@PathVariable UUID id,
                                                                     @Valid @RequestBody(required = false) InadimplenciaStatusDTO body) {
        if (body != null && "Pago".equalsIgnoreCase(body.getStatus())) {
            InadimplenciaResponseDTO response = inadimplenciaService.confirmarPagamento(id, body);
            return ResponseEntity.ok(response);
        }
        // Se o corpo não indicar "Pago", apenas retorna o registro atual sem erro 400.
        InadimplenciaResponseDTO atual = inadimplenciaService.consultar(id);
        return ResponseEntity.ok(atual);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancelar inadimplência (soft delete – não aparece mais na listagem)")
    public ResponseEntity<Void> cancelar(@PathVariable UUID id) {
        try {
            inadimplenciaService.cancelar(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao cancelar inadimplência (DELETE /api/inadimplentes/{}): ", id, e);
            throw e;
        }
    }
}
