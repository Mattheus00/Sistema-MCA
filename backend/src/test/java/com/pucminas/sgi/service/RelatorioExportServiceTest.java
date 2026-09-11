package com.pucminas.sgi.service;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class RelatorioExportServiceTest {

    private final RelatorioExportService service =
            new RelatorioExportService(Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC));

    @Test
    void exportarPdfGeraArquivoNaoVazio() throws Exception {
        org.springframework.core.io.ByteArrayResource resource =
                (org.springframework.core.io.ByteArrayResource) service.exportarPdf(
                        "inadimplentes", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        assertThat(resource.getByteArray().length).isGreaterThan(0);
        assertThat(resource.getByteArray()).startsWith("%PDF".getBytes());
    }

    @Test
    void exportarExcelGeraArquivoNaoVazio() throws Exception {
        Resource resource = service.exportarExcel("resumo", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        assertThat(resource.contentLength()).isGreaterThan(0);
    }
}
