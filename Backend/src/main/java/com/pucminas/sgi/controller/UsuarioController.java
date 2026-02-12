package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.CadastroUsuarioDTO;
import com.pucminas.sgi.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuários", description = "Cadastro de usuários")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping
    @Operation(summary = "Cadastrar usuário")
    public ResponseEntity<Void> cadastrar(@Valid @RequestBody CadastroUsuarioDTO dto) {
        usuarioService.cadastrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
