package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DocumentoUtilTest {

    @Test
    @DisplayName("Normaliza CPF removendo pontuação")
    void normalizaCpf() {
        assertEquals("12345678901", DocumentoUtil.normalizarDocumento("123.456.789-01"));
    }

    @Test
    @DisplayName("Extrai CNPJ do nome do arquivo")
    void extraiCnpjDoArquivo() {
        List<String> docs = DocumentoUtil.extrairDocumentosDoTexto("boleto_12345678000190.pdf");
        assertEquals(1, docs.size());
        assertEquals("12345678000190", docs.get(0));
    }

    @Test
    @DisplayName("Mascara CPF parcialmente")
    void mascaraCpf() {
        assertTrue(DocumentoUtil.mascararDocumento("12345678901").contains("***"));
    }
}
