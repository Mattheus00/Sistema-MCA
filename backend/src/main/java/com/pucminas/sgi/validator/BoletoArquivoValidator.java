package com.pucminas.sgi.validator;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class BoletoArquivoValidator {

    private static final byte[] PDF_SIGNATURE = new byte[]{0x25, 0x50, 0x44, 0x46}; // %PDF

    private final BoletoEnvioProperties properties;

    public BoletoArquivoValidator(BoletoEnvioProperties properties) {
        this.properties = properties;
    }

    public void validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessRuleException("Arquivo vazio ou ausente.");
        }
        String nome = arquivo.getOriginalFilename();
        if (nome == null || nome.isBlank()) {
            throw new BusinessRuleException("Nome do arquivo é obrigatório.");
        }
        if (!nome.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new BusinessRuleException("Somente arquivos PDF são permitidos: " + sanitizarNomeExibicao(nome));
        }
        if (arquivo.getSize() > properties.getMaxFileSizeBytes()) {
            throw new BusinessRuleException("Arquivo excede o tamanho máximo permitido: " + sanitizarNomeExibicao(nome));
        }
        String contentType = arquivo.getContentType();
        Set<String> permitidos = Arrays.stream(properties.getAllowedContentTypes().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        if (contentType != null && !permitidos.isEmpty() && !permitidos.contains(contentType)) {
            throw new BusinessRuleException("Tipo de conteúdo não permitido: " + sanitizarNomeExibicao(nome));
        }
        try {
            byte[] header = arquivo.getInputStream().readNBytes(4);
            if (header.length < 4 || !assinaturaPdf(header)) {
                throw new BusinessRuleException("Arquivo não é um PDF válido: " + sanitizarNomeExibicao(nome));
            }
        } catch (BusinessRuleException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessRuleException("Não foi possível validar o arquivo: " + sanitizarNomeExibicao(nome));
        }
    }

    public static String sanitizarNomeExibicao(String nome) {
        if (nome == null) {
            return "";
        }
        String limpo = nome.replaceAll("[\\r\\n\\u0000]", "");
        if (limpo.length() > 200) {
            return limpo.substring(0, 200);
        }
        return limpo;
    }

    private static boolean assinaturaPdf(byte[] header) {
        for (int i = 0; i < PDF_SIGNATURE.length; i++) {
            if (header[i] != PDF_SIGNATURE[i]) {
                return false;
            }
        }
        return true;
    }
}
