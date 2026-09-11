package com.pucminas.sgi.service;

import com.pucminas.sgi.exception.ExportacaoRelatorioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class RelatorioExportService {

    private final Clock clock;

    public Resource exportarPdf(String tipoRelatorio, LocalDate periodoInicio, LocalDate periodoFim) {
        return new ByteArrayResource(gerarPdf(tipoRelatorio, periodoInicio, periodoFim));
    }

    public Resource exportarExcel(String tipoRelatorio, LocalDate periodoInicio, LocalDate periodoFim) {
        return new ByteArrayResource(gerarExcel(tipoRelatorio, periodoInicio, periodoFim));
    }

    byte[] gerarPdf(String tipo, LocalDate inicio, LocalDate fim) {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            com.lowagie.text.Document document = new com.lowagie.text.Document();
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);
            document.open();
            document.add(new com.lowagie.text.Paragraph("Relatório SGI - " + tipo,
                    com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 16)));
            document.add(new com.lowagie.text.Paragraph("Período: " + inicio + " a " + fim));
            document.add(new com.lowagie.text.Paragraph("Gerado em: " + LocalDateTime.now(clock)));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Falha ao gerar PDF do relatório {}: {}", tipo, e.getMessage(), e);
            throw new ExportacaoRelatorioException("Não foi possível gerar o PDF do relatório.", e);
        }
    }

    byte[] gerarExcel(String tipo, LocalDate inicio, LocalDate fim) {
        try {
            org.apache.poi.ss.usermodel.Workbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = wb.createSheet("Relatório");
            org.apache.poi.ss.usermodel.Row row0 = sheet.createRow(0);
            row0.createCell(0).setCellValue("Relatório SGI - " + tipo);
            org.apache.poi.ss.usermodel.Row row1 = sheet.createRow(1);
            row1.createCell(0).setCellValue("Período: " + inicio + " a " + fim);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            wb.write(out);
            wb.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Falha ao gerar Excel do relatório {}: {}", tipo, e.getMessage(), e);
            throw new ExportacaoRelatorioException("Não foi possível gerar o Excel do relatório.", e);
        }
    }
}
