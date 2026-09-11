package com.pucminas.sgi.controller;

import org.springframework.validation.annotation.Validated;

import com.pucminas.sgi.dto.request.ClienteDTO;
import com.pucminas.sgi.dto.response.ClienteResponseDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.service.ClienteService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clientes")
@PreAuthorize(StaffAuth.STAFF)
@Tag(name = "Clientes", description = "CRUD e listagem de clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @PostMapping
    @Operation(summary = "Cadastrar cliente")
    public ResponseEntity<ClienteResponseDTO> cadastrar(@Validated(ClienteDTO.Completo.class) @RequestBody ClienteDTO dto) {
        ClienteResponseDTO response = clienteService.cadastrarCliente(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/ranking-devedores")
    @PreAuthorize(StaffAuth.FINANCEIRO)
    @Operation(summary = "Top 10 maiores devedores")
    public ResponseEntity<List<ClienteResponseDTO>> rankingDevedores(@RequestParam(defaultValue = "10") int limite) {
        List<ClienteResponseDTO> list = clienteService.rankingMaioresDevedores(limite);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar cliente por ID")
    public ResponseEntity<ClienteResponseDTO> consultar(@PathVariable UUID id) {
        ClienteResponseDTO response = clienteService.consultarCliente(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar cliente")
    public ResponseEntity<ClienteResponseDTO> atualizar(@PathVariable UUID id, @Validated(ClienteDTO.Completo.class) @RequestBody ClienteDTO dto) {
        ClienteResponseDTO response = clienteService.atualizarCliente(id, dto);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Atualização parcial do cliente (campos enviados; com nome+cpfCnpj substitui opcionais)")
    public ResponseEntity<ClienteResponseDTO> atualizarParcial(@PathVariable UUID id, @Valid @RequestBody ClienteDTO dto) {
        ClienteResponseDTO response = clienteService.atualizarClientePartial(id, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(StaffAuth.FINANCEIRO)
    @Operation(summary = "Excluir cliente (soft delete - marca como inativo)")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        clienteService.excluirCliente(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Operation(summary = "Listar clientes com busca por nome/código/CPF, filtro de status e paginação")
    public ResponseEntity<Page<ClienteResponseDTO>> listar(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) StatusCliente status,
            @RequestParam(required = false) StatusCliente statusCliente,
            @PageableDefault(size = 20) Pageable pageable) {
        StatusCliente filtroStatus = statusCliente != null ? statusCliente : status;
        String termoBusca = (busca != null && !busca.isBlank()) ? busca : nome;
        Page<ClienteResponseDTO> page = clienteService.listarClientes(termoBusca, filtroStatus, pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}/dividas")
    @Operation(summary = "Listar dívidas do cliente")
    public ResponseEntity<List<DividaResponseDTO>> listarDividas(@PathVariable UUID id) {
        List<DividaResponseDTO> list = clienteService.listarDividasPorCliente(id);
        return ResponseEntity.ok(list);
    }
}
