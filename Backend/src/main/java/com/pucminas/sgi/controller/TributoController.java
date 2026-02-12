package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.CalcularTributoRequestDTO;
import com.pucminas.sgi.dto.request.ConsultaGeminiRequestDTO;
import com.pucminas.sgi.dto.request.CreditoTributoRequestDTO;
import com.pucminas.sgi.dto.request.NotaFiscalTributoRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.service.GeminiService;
import com.pucminas.sgi.service.TributoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Cálculos da Reforma Tributária (CBS/IBS) e consulta à IA (Gemini).
 */
@RestController
@RequestMapping("/api/tributos")
@Tag(name = "Tributos (Reforma Tributária)", description = "Cálculos CBS/IBS e consulta IA")
public class TributoController {

    private final TributoService tributoService;
    private final GeminiService geminiService;

    public TributoController(TributoService tributoService, GeminiService geminiService) {
        this.tributoService = tributoService;
        this.geminiService = geminiService;
    }

    @PostMapping("/calcular")
    @Operation(summary = "Calcular tributo", description = "Tipos: POR_DENTRO, POR_FORA, SEPARAR_CBS_IBS, MARGEM_LUCRO. Categoria: PLENO, REDUZIDO, ZERO.")
    public ResponseEntity<CalcularTributoResponseDTO> calcular(@Valid @RequestBody CalcularTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcular(request));
    }

    @GetMapping("/aliquotas/{categoria}")
    @Operation(summary = "Obter alíquotas por categoria", description = "categoria: PLENO, REDUZIDO ou ZERO")
    public ResponseEntity<AliquotasResponseDTO> getAliquotas(@PathVariable String categoria) {
        return ResponseEntity.ok(tributoService.getAliquotas(categoria));
    }

    @PostMapping("/creditos/validar")
    @Operation(summary = "Calcular crédito tributário (não-cumulatividade)")
    public ResponseEntity<CreditoTributoResponseDTO> validarCredito(@Valid @RequestBody CreditoTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcularComCredito(request));
    }

    @GetMapping("/regime/{cnpj}")
    @Operation(summary = "Regime tributário (simulado)", description = "Retorna regime padrão PLENO; em produção integrar com base oficial.")
    public ResponseEntity<AliquotasResponseDTO> getRegime(@PathVariable String cnpj) {
        return ResponseEntity.ok(tributoService.getAliquotas("PLENO"));
    }

    @PostMapping("/nota-fiscal/gerar")
    @Operation(summary = "Calcular totais CBS/IBS de uma nota fiscal")
    public ResponseEntity<NotaFiscalTributoResponseDTO> gerarNotaFiscal(@Valid @RequestBody NotaFiscalTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcularNotaFiscal(request));
    }

    @PostMapping("/consulta-ia")
    @Operation(summary = "Consultar IA (Gemini) sobre reforma tributária. Requer POST com body JSON: { pergunta, contexto? }.")
    public ResponseEntity<ConsultaGeminiResponseDTO> consultaGemini(@Valid @RequestBody ConsultaGeminiRequestDTO request) {
        try {
            String pergunta = request != null && request.getPergunta() != null ? request.getPergunta() : "";
            String contexto = request != null ? request.getContexto() : null;
            String resposta = geminiService.consultar(pergunta, contexto);
            return ResponseEntity.ok(ConsultaGeminiResponseDTO.builder()
                    .sucesso(true)
                    .resposta(resposta)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.ok(ConsultaGeminiResponseDTO.builder()
                    .sucesso(false)
                    .resposta(null)
                    .erro("Erro ao processar consulta: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/cashback")
    @Operation(summary = "Calcular cashback CBS (devolução para baixa renda)")
    public ResponseEntity<java.util.Map<String, java.math.BigDecimal>> cashback(
            @RequestParam java.math.BigDecimal valorCompra,
            @RequestParam(required = false, defaultValue = "1.0") java.math.BigDecimal percentualDevolucao) {
        java.math.BigDecimal valor = tributoService.calcularCashback(valorCompra, percentualDevolucao);
        return ResponseEntity.ok(java.util.Map.of("cashbackCBS", valor));
    }
}
