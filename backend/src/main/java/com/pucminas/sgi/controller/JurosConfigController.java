package com.pucminas.sgi.controller;

import jakarta.validation.Valid;

import com.pucminas.sgi.dto.response.JurosConfigDTO;
import com.pucminas.sgi.service.JurosConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.pucminas.sgi.security.StaffAuth;

@RestController
@RequestMapping("/api/config/juros")
@Tag(name = "Configuração de Juros", description = "Taxas de multa e juros aplicadas às dívidas")
@RequiredArgsConstructor
public class JurosConfigController {

    private final JurosConfigService jurosConfigService;

    @GetMapping
    @PreAuthorize(StaffAuth.STAFF)
    @Operation(summary = "Obter configuração de juros")
    public ResponseEntity<JurosConfigDTO> get() {
        return ResponseEntity.ok(jurosConfigService.obter());
    }

    @PutMapping
    @PreAuthorize(StaffAuth.FINANCEIRO)
    @Operation(summary = "Atualizar configuração de juros")
    public ResponseEntity<JurosConfigDTO> atualizar(@Valid @RequestBody JurosConfigDTO body) {
        return ResponseEntity.ok(jurosConfigService.atualizar(body));
    }
}
