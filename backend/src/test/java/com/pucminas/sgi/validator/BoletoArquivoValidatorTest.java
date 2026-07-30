package com.pucminas.sgi.validator;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class BoletoArquivoValidatorTest {

    private BoletoArquivoValidator validator;

    @BeforeEach
    void setUp() {
        BoletoEnvioProperties props = new BoletoEnvioProperties();
        props.setMaxFileSizeBytes(1024 * 1024);
        validator = new BoletoArquivoValidator(props);
    }

    @Test
    @DisplayName("Aceita PDF válido")
    void pdfValido() {
        MockMultipartFile file = new MockMultipartFile(
                "arquivo", "boleto.pdf", "application/pdf", "%PDF-1.4 test".getBytes());
        assertDoesNotThrow(() -> validator.validar(file));
    }

    @Test
    @DisplayName("Rejeita extensão inválida")
    void extensaoInvalida() {
        MockMultipartFile file = new MockMultipartFile(
                "arquivo", "boleto.txt", "text/plain", "x".getBytes());
        assertThrows(BusinessRuleException.class, () -> validator.validar(file));
    }

    @Test
    @DisplayName("Rejeita PDF falso renomeado")
    void pdfFalso() {
        MockMultipartFile file = new MockMultipartFile(
                "arquivo", "boleto.pdf", "application/pdf", "NAO_E_PDF".getBytes());
        assertThrows(BusinessRuleException.class, () -> validator.validar(file));
    }
}
