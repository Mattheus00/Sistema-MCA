package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.AtualizarClienteBoletoRequest;
import com.pucminas.sgi.dto.request.EnviarLoteRequest;
import com.pucminas.sgi.dto.response.CriarLoteEnvioResponse;
import com.pucminas.sgi.dto.response.EnviarLoteResponse;
import com.pucminas.sgi.dto.response.HistoricoLoteResponse;
import com.pucminas.sgi.dto.response.LoteEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.ResultadoEnvioLoteResponse;
import com.pucminas.sgi.dto.response.ValidacaoLoteResponse;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.service.BoletoArquivoStorageService;
import com.pucminas.sgi.service.LoteEnvioBoletoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lotes-envio-boletos")
@Tag(name = "Envio de boletos", description = "Upload, conferência e envio de boletos PDF por e-mail")
public class LoteEnvioBoletoController {

    private final LoteEnvioBoletoService loteService;
    private final BoletoArquivoStorageService storageService;

    public LoteEnvioBoletoController(LoteEnvioBoletoService loteService,
                                     BoletoArquivoStorageService storageService) {
        this.loteService = loteService;
        this.storageService = storageService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Criar lote e analisar PDFs")
    public ResponseEntity<CriarLoteEnvioResponse> criarLote(
            Authentication authentication,
            @RequestParam("arquivos") List<MultipartFile> arquivos) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.criarLote(usuarioId, arquivos));
    }

    @GetMapping
    @Operation(summary = "Histórico de lotes")
    public ResponseEntity<Page<HistoricoLoteResponse>> listarHistorico(
            Authentication authentication,
            @RequestParam(required = false) StatusLoteEnvioBoleto status,
            @RequestParam(required = false) UUID usuarioId,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String nomeArquivo,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID solicitanteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.listarHistorico(
                solicitanteId, status, usuarioId, clienteId, dataInicio, dataFim, email, nomeArquivo, pageable));
    }

    @GetMapping("/{loteId}")
    @Operation(summary = "Consultar lote")
    public ResponseEntity<LoteEnvioBoletoResponse> consultarLote(
            Authentication authentication,
            @PathVariable UUID loteId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.consultarLote(usuarioId, loteId));
    }

    @GetMapping("/{loteId}/resultado-envio")
    @Operation(summary = "Resultado do envio por cliente (enviados, erros e não enviados)")
    public ResponseEntity<ResultadoEnvioLoteResponse> consultarResultadoEnvio(
            Authentication authentication,
            @PathVariable UUID loteId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.consultarResultadoEnvio(usuarioId, loteId));
    }

    @PatchMapping("/{loteId}/itens/{itemId}/cliente")
    @Operation(summary = "Corrigir cliente do item")
    public ResponseEntity<LoteEnvioBoletoResponse> atualizarCliente(
            Authentication authentication,
            @PathVariable UUID loteId,
            @PathVariable UUID itemId,
            @Valid @RequestBody AtualizarClienteBoletoRequest request) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.atualizarCliente(usuarioId, loteId, itemId, request));
    }

    @PatchMapping("/{loteId}/itens/{itemId}/confirmar")
    @Operation(summary = "Confirmar item com confiança baixa")
    public ResponseEntity<LoteEnvioBoletoResponse> confirmarItem(
            Authentication authentication,
            @PathVariable UUID loteId,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.confirmarItem(usuarioId, loteId, itemId));
    }

    @PatchMapping("/{loteId}/itens/{itemId}/ignorar")
    @Operation(summary = "Ignorar item")
    public ResponseEntity<LoteEnvioBoletoResponse> ignorarItem(
            Authentication authentication,
            @PathVariable UUID loteId,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.ignorarItem(usuarioId, loteId, itemId));
    }

    @PatchMapping("/{loteId}/itens/{itemId}/reativar")
    @Operation(summary = "Reativar item ignorado")
    public ResponseEntity<LoteEnvioBoletoResponse> reativarItem(
            Authentication authentication,
            @PathVariable UUID loteId,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.reativarItem(usuarioId, loteId, itemId));
    }

    @GetMapping("/{loteId}/itens/{itemId}/arquivo")
    @Operation(summary = "Visualizar PDF do boleto")
    public ResponseEntity<byte[]> visualizarArquivo(
            Authentication authentication,
            @PathVariable UUID loteId,
            @PathVariable UUID itemId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        EnvioBoleto item = loteService.buscarItemParaDownload(usuarioId, loteId, itemId);
        byte[] pdf = storageService.ler(loteId, item.getNomeArquivoArmazenado());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + item.getNomeArquivoOriginal() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PostMapping("/{loteId}/validar")
    @Operation(summary = "Validar lote antes do envio")
    public ResponseEntity<ValidacaoLoteResponse> validarLote(
            Authentication authentication,
            @PathVariable UUID loteId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.validarLote(usuarioId, loteId));
    }

    @PostMapping("/{loteId}/enviar")
    @Operation(summary = "Confirmar e enviar boletos do lote")
    public ResponseEntity<EnviarLoteResponse> enviarLote(
            Authentication authentication,
            @PathVariable UUID loteId,
            @RequestBody(required = false) EnviarLoteRequest request) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(loteService.enviarLote(usuarioId, loteId, request));
    }

    @PostMapping("/{loteId}/cancelar")
    @Operation(summary = "Cancelar lote")
    public ResponseEntity<Void> cancelarLote(
            Authentication authentication,
            @PathVariable UUID loteId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        loteService.cancelarLote(usuarioId, loteId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/{loteId}/relatorio.csv", produces = "text/csv")
    @Operation(summary = "Baixar relatório CSV do lote")
    public ResponseEntity<byte[]> relatorioCsv(
            Authentication authentication,
            @PathVariable UUID loteId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        String csv = loteService.gerarCsvRelatorio(usuarioId, loteId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lote-" + loteId + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
