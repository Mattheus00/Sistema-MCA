package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.AtualizarRespostaDocumentoRequestDTO;
import com.pucminas.sgi.dto.request.AtualizarStatusDocumentoRequestDTO;
import com.pucminas.sgi.dto.response.PortalDocumentoDTO;
import com.pucminas.sgi.dto.response.ResumoDocumentosClientesDTO;
import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import com.pucminas.sgi.service.DocumentoClienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@Tag(name = "Documentos do cliente", description = "Visualização de documentos enviados pelo portal (escritório)")
public class DocumentoClienteController {

    private final DocumentoClienteService documentoClienteService;

    public DocumentoClienteController(DocumentoClienteService documentoClienteService) {
        this.documentoClienteService = documentoClienteService;
    }

    @GetMapping("/api/clientes/{clienteId}/documentos")
    @Operation(summary = "Listar documentos enviados por um cliente")
    public ResponseEntity<Page<PortalDocumentoDTO>> listarPorCliente(
            @PathVariable UUID clienteId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(documentoClienteService.listarDoCliente(clienteId, pageable));
    }

    @GetMapping("/api/documentos-clientes/resumo")
    @Operation(summary = "Resumo de documentos por status")
    public ResponseEntity<ResumoDocumentosClientesDTO> resumo() {
        return ResponseEntity.ok(documentoClienteService.resumo());
    }

    @GetMapping("/api/documentos-clientes")
    @Operation(summary = "Listar documentos de todos os clientes (filtros opcionais)")
    public ResponseEntity<Page<PortalDocumentoDTO>> listarTodos(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) StatusDocumentoCliente status,
            @RequestParam(required = false) TipoDocumentoCliente tipo,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(documentoClienteService.listarStaff(clienteId, status, tipo, pageable));
    }

    @GetMapping("/api/documentos-clientes/{documentoId}")
    @Operation(summary = "Metadados de documento (escritório)")
    public ResponseEntity<PortalDocumentoDTO> obter(@PathVariable UUID documentoId) {
        return ResponseEntity.ok(documentoClienteService.obter(documentoId));
    }

    @GetMapping("/api/documentos-clientes/{documentoId}/arquivo")
    @Operation(summary = "Download de documento (escritório)")
    public ResponseEntity<byte[]> download(@PathVariable UUID documentoId) {
        DocumentoCliente doc = documentoClienteService.carregar(documentoId);
        byte[] bytes = documentoClienteService.lerArquivo(doc);
        String filename = URLEncoder.encode(doc.getNomeOriginal(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .body(bytes);
    }

    @PatchMapping("/api/documentos-clientes/{documentoId}/status")
    @Operation(summary = "Atualizar status do documento")
    public ResponseEntity<PortalDocumentoDTO> atualizarStatus(
            @PathVariable UUID documentoId,
            @Valid @RequestBody AtualizarStatusDocumentoRequestDTO dto) {
        return ResponseEntity.ok(documentoClienteService.atualizarStatus(documentoId, dto.getStatus()));
    }

    @PatchMapping("/api/documentos-clientes/{documentoId}/resposta")
    @Operation(summary = "Responder ao cliente sobre o documento")
    public ResponseEntity<PortalDocumentoDTO> responder(
            Authentication authentication,
            @PathVariable UUID documentoId,
            @Valid @RequestBody AtualizarRespostaDocumentoRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(documentoClienteService.responder(documentoId, dto.getResposta(), usuarioId));
    }
}
