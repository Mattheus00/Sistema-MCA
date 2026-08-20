package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.PortalDocumentoDTO;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import com.pucminas.sgi.service.DocumentoClienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/portal/documentos")
@Tag(name = "Portal — Documentos", description = "Envio de documentos pelo cliente")
public class PortalDocumentoController {

    private final DocumentoClienteService documentoClienteService;

    public PortalDocumentoController(DocumentoClienteService documentoClienteService) {
        this.documentoClienteService = documentoClienteService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Enviar documento")
    public ResponseEntity<PortalDocumentoDTO> enviar(
            Authentication authentication,
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam("tipo") TipoDocumentoCliente tipo,
            @RequestParam(value = "dividaId", required = false) UUID dividaId,
            @RequestParam(value = "observacao", required = false) String observacao) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(documentoClienteService.enviar(clienteId, arquivo, tipo, dividaId, observacao));
    }

    @GetMapping
    @Operation(summary = "Listar documentos enviados pelo cliente")
    public ResponseEntity<Page<PortalDocumentoDTO>> listar(
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(documentoClienteService.listarDoCliente(clienteId, pageable));
    }

    @GetMapping("/{documentoId}")
    @Operation(summary = "Metadados de um documento")
    public ResponseEntity<PortalDocumentoDTO> obter(
            Authentication authentication,
            @PathVariable UUID documentoId) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        documentoClienteService.carregarParaCliente(documentoId, clienteId);
        return ResponseEntity.ok(documentoClienteService.obter(documentoId));
    }

    @GetMapping("/{documentoId}/arquivo")
    @Operation(summary = "Download do arquivo enviado")
    public ResponseEntity<byte[]> download(
            Authentication authentication,
            @PathVariable UUID documentoId) {
        UUID clienteId = (UUID) authentication.getPrincipal();
        var doc = documentoClienteService.carregarParaCliente(documentoId, clienteId);
        byte[] bytes = documentoClienteService.lerArquivo(doc);
        String filename = URLEncoder.encode(doc.getNomeOriginal(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .body(bytes);
    }
}
