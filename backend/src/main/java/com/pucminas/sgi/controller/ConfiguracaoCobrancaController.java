package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.ConfiguracaoCobrancaDTO;
import com.pucminas.sgi.dto.response.ConfiguracaoCobrancaResponseDTO;
import com.pucminas.sgi.service.ConfiguracaoCobrancaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/clientes/{clienteId}/configuracao-cobranca")
@Tag(name = "Configuração de cobrança", description = "Configuração de cobrança recorrente por cliente")
public class ConfiguracaoCobrancaController {

    private final ConfiguracaoCobrancaService configuracaoService;

    public ConfiguracaoCobrancaController(ConfiguracaoCobrancaService configuracaoService) {
        this.configuracaoService = configuracaoService;
    }

    @GetMapping
    @Operation(summary = "Consultar configuração de cobrança do cliente")
    public ResponseEntity<ConfiguracaoCobrancaResponseDTO> consultar(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(configuracaoService.consultar(clienteId));
    }

    @PostMapping
    @Operation(summary = "Criar configuração de cobrança do cliente")
    public ResponseEntity<ConfiguracaoCobrancaResponseDTO> criar(@PathVariable UUID clienteId,
                                                                 @Valid @RequestBody ConfiguracaoCobrancaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(configuracaoService.salvar(clienteId, dto));
    }

    @PutMapping
    @Operation(summary = "Atualizar configuração de cobrança do cliente")
    public ResponseEntity<ConfiguracaoCobrancaResponseDTO> atualizar(@PathVariable UUID clienteId,
                                                                     @Valid @RequestBody ConfiguracaoCobrancaDTO dto) {
        return ResponseEntity.ok(configuracaoService.salvar(clienteId, dto));
    }
}
