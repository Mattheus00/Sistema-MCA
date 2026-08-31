package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.LivroCaixaMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.request.MarcarMovimentacaoRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.service.LivroCaixaAnexoService;
import com.pucminas.sgi.service.LivroCaixaMovimentacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/livro-caixa")
@Tag(name = "Livro Caixa", description = "Controle financeiro do escritório")
public class LivroCaixaController {

    private final LivroCaixaMovimentacaoService movimentacaoService;
    private final LivroCaixaAnexoService anexoService;

    public LivroCaixaController(LivroCaixaMovimentacaoService movimentacaoService,
                                LivroCaixaAnexoService anexoService) {
        this.movimentacaoService = movimentacaoService;
        this.anexoService = anexoService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard com saldos e totais do mês")
    public ResponseEntity<LivroCaixaDashboardDTO> dashboard(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.dashboard(usuarioId));
    }

    @GetMapping("/movimentacoes")
    @Operation(summary = "Listar movimentações com filtros")
    public ResponseEntity<Page<LivroCaixaMovimentacaoResponseDTO>> listar(
            Authentication authentication,
            @RequestParam(required = false) LivroCaixaTipoMovimentacao tipo,
            @RequestParam(required = false) LivroCaixaStatusMovimentacao status,
            @RequestParam(required = false) UUID categoriaId,
            @RequestParam(required = false) UUID contaId,
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) FormaPagamentoLivroCaixa formaPagamento,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) BigDecimal valorMin,
            @RequestParam(required = false) BigDecimal valorMax,
            @RequestParam(required = false) String busca,
            @PageableDefault(size = 20, sort = "dataMovimentacao") Pageable pageable) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.listar(
                usuarioId, tipo, status, categoriaId, contaId, clienteId, formaPagamento,
                dataInicio, dataFim, valorMin, valorMax, busca, pageable));
    }

    @GetMapping("/movimentacoes/{id}")
    @Operation(summary = "Detalhar movimentação com histórico e anexos")
    public ResponseEntity<LivroCaixaMovimentacaoDetalheDTO> detalhar(
            Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.detalhar(usuarioId, id));
    }

    @PostMapping("/movimentacoes")
    @Operation(summary = "Criar movimentação manual")
    public ResponseEntity<LivroCaixaMovimentacaoResponseDTO> criar(
            Authentication authentication,
            @Valid @RequestBody LivroCaixaMovimentacaoRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(movimentacaoService.criar(usuarioId, dto));
    }

    @PutMapping("/movimentacoes/{id}")
    @Operation(summary = "Atualizar movimentação manual")
    public ResponseEntity<LivroCaixaMovimentacaoResponseDTO> atualizar(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody LivroCaixaMovimentacaoRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.atualizar(usuarioId, id, dto));
    }

    @PatchMapping("/movimentacoes/{id}/receber")
    @Operation(summary = "Marcar entrada como recebida")
    public ResponseEntity<LivroCaixaMovimentacaoResponseDTO> marcarRecebido(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody MarcarMovimentacaoRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.marcarComoRecebido(usuarioId, id, dto));
    }

    @PatchMapping("/movimentacoes/{id}/pagar")
    @Operation(summary = "Marcar saída como paga")
    public ResponseEntity<LivroCaixaMovimentacaoResponseDTO> marcarPago(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody MarcarMovimentacaoRequestDTO dto) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.marcarComoPago(usuarioId, id, dto));
    }

    @PatchMapping("/movimentacoes/{id}/cancelar")
    @Operation(summary = "Cancelar movimentação (soft delete)")
    public ResponseEntity<LivroCaixaMovimentacaoResponseDTO> cancelar(
            Authentication authentication, @PathVariable UUID id) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.cancelar(usuarioId, id));
    }

    @PostMapping("/movimentacoes/{id}/anexos")
    @Operation(summary = "Anexar comprovante à movimentação")
    public ResponseEntity<LivroCaixaAnexoResponseDTO> anexar(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam("arquivo") MultipartFile arquivo) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(anexoService.anexar(usuarioId, id, arquivo));
    }

    @GetMapping("/movimentacoes/{movimentacaoId}/anexos/{anexoId}")
    @Operation(summary = "Download de anexo")
    public ResponseEntity<byte[]> downloadAnexo(
            Authentication authentication,
            @PathVariable UUID movimentacaoId,
            @PathVariable UUID anexoId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        var anexo = anexoService.requireAnexo(movimentacaoId, anexoId);
        byte[] bytes = anexoService.download(usuarioId, movimentacaoId, anexoId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + anexo.getNomeOriginal() + "\"")
                .contentType(MediaType.parseMediaType(anexo.getContentType()))
                .body(bytes);
    }

    @GetMapping("/analise")
    @Operation(summary = "Gráficos e fluxo de caixa")
    public ResponseEntity<LivroCaixaAnaliseDTO> analise(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.analise(usuarioId, dataInicio, dataFim));
    }

    @GetMapping("/relatorio")
    @Operation(summary = "Relatório do Livro Caixa (JSON)")
    public ResponseEntity<LivroCaixaRelatorioDTO> relatorio(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @RequestParam(required = false) LivroCaixaTipoMovimentacao tipo,
            @RequestParam(required = false) LivroCaixaStatusMovimentacao status,
            @RequestParam(required = false) UUID categoriaId,
            @RequestParam(required = false) UUID contaId) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(movimentacaoService.relatorio(
                usuarioId, dataInicio, dataFim, tipo, status, categoriaId, contaId));
    }
}
