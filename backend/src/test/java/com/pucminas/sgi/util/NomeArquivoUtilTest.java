package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NomeArquivoUtilTest {

    @Test
    @DisplayName("Remove caminho Windows do nome do arquivo")
    void extraiNomeSemCaminhoWindows() {
        assertEquals("DUVAL DE FIGUEIREDO PIRES.pdf",
                NomeArquivoUtil.extrairNomeBase("C:\\Users\\Matheus\\Downloads\\DUVAL DE FIGUEIREDO PIRES.pdf"));
    }

    @Test
    @DisplayName("Mantém nome simples")
    void mantemNomeSimples() {
        assertEquals("cliente.pdf", NomeArquivoUtil.extrairNomeBase("cliente.pdf"));
    }
}
