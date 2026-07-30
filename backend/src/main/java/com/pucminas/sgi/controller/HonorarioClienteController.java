package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.HonorarioClienteDTO;
import com.pucminas.sgi.dto.request.ReajusteHonorarioRequestDTO;
import com.pucminas.sgi.dto.response.HonorarioClienteResponseDTO;
import com.pucminas.sgi.dto.response.ReajusteHonorarioResumoDTO;
import com.pucminas.sgi.service.HonorarioClienteService;
import com.pucminas.sgi.service.ReajusteHonorarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Honorários", description = "Histórico de honorários e reajustes em lote")
public class HonorarioClienteController {

    private final HonorarioClienteService honorarioService;
    private final ReajusteHonorarioService reajusteService;

    public HonorarioClienteController(HonorarioClienteService honorarioService,
                                      ReajusteHonorarioService reajusteService) {
        this.honorarioService = honorarioService;
        this.reajusteService = reajusteService;
    }

    @GetMapping("/api/clientes/{clienteId}/honorarios")
    @Operation(summary = "Listar histórico de honorários do cliente")
    public ResponseEntity<List<HonorarioClienteResponseDTO>> historico(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(honorarioService.listarHistorico(clienteId));
    }

    @GetMapping("/api/clientes/{clienteId}/honorarios/atual")
    @Operation(summary = "Consultar honorário atual do cliente")
    public ResponseEntity<HonorarioClienteResponseDTO> atual(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(honorarioService.consultarAtual(clienteId));
    }

    @PostMapping("/api/clientes/{clienteId}/honorarios")
    @Operation(summary = "Cadastrar novo valor de honorário")
    public ResponseEntity<HonorarioClienteResponseDTO> cadastrar(@PathVariable UUID clienteId,
                                                                 @Valid @RequestBody HonorarioClienteDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(honorarioService.cadastrarNovoValor(clienteId, dto));
    }

    @PostMapping("/api/honorarios/reajustes/simular")
    @Operation(summary = "Simular reajuste de honorários em lote")
    public ResponseEntity<ReajusteHonorarioResumoDTO> simular(@Valid @RequestBody ReajusteHonorarioRequestDTO dto) {
        return ResponseEntity.ok(reajusteService.simular(dto));
    }

    @PostMapping("/api/honorarios/reajustes/aplicar")
    @Operation(summary = "Aplicar reajuste de honorários em lote")
    public ResponseEntity<ReajusteHonorarioResumoDTO> aplicar(@Valid @RequestBody ReajusteHonorarioRequestDTO dto) {
        return ResponseEntity.ok(reajusteService.aplicar(dto));
    }
}
