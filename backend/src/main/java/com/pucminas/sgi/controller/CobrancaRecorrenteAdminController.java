package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.GeracaoCobrancaRequestDTO;
import com.pucminas.sgi.dto.response.GeracaoCobrancaResultadoDTO;
import com.pucminas.sgi.service.AuditoriaService;
import com.pucminas.sgi.service.GeracaoCobrancaRecorrenteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;

@RestController
@Tag(name = "Admin - cobranças recorrentes", description = "Execução manual de rotinas de cobrança")
public class CobrancaRecorrenteAdminController {

    private final GeracaoCobrancaRecorrenteService geracaoService;
    private final AuditoriaService auditoriaService;

    public CobrancaRecorrenteAdminController(GeracaoCobrancaRecorrenteService geracaoService,
                                             AuditoriaService auditoriaService) {
        this.geracaoService = geracaoService;
        this.auditoriaService = auditoriaService;
    }

    @PostMapping("/api/admin/cobrancas-recorrentes/gerar")
    @Operation(summary = "Executar geração mensal de cobranças recorrentes")
    public ResponseEntity<GeracaoCobrancaResultadoDTO> gerarMensal(@RequestBody(required = false) GeracaoCobrancaRequestDTO dto) {
        YearMonth competencia = geracaoService.parseCompetencia(dto != null ? dto.getCompetencia() : null);
        GeracaoCobrancaResultadoDTO resultado = geracaoService.gerarHonorariosMensais(competencia, false);
        auditoriaService.registrar("EXECUCAO_MANUAL_COBRANCA_RECORRENTE", "Divida", null,
                "competencia=" + resultado.getCompetencia());
        return ResponseEntity.ok(resultado);
    }

    @PostMapping("/api/admin/taxas-balanco/gerar")
    @Operation(summary = "Executar geração manual da taxa de balanço")
    public ResponseEntity<GeracaoCobrancaResultadoDTO> gerarTaxaBalanco(@RequestBody(required = false) GeracaoCobrancaRequestDTO dto) {
        int ano = dto != null && dto.getAno() != null ? dto.getAno() : YearMonth.now().getYear();
        GeracaoCobrancaResultadoDTO resultado = geracaoService.gerarTaxasBalanco(ano, false);
        auditoriaService.registrar("EXECUCAO_MANUAL_TAXA_BALANCO", "Divida", null,
                "ano=" + ano);
        return ResponseEntity.ok(resultado);
    }
}
