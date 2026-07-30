package com.pucminas.sgi.util;

import java.nio.file.Path;
import java.nio.file.Paths;

public final class NomeArquivoUtil {

    private NomeArquivoUtil() {
    }

    /**
     * Em alguns navegadores no Windows o {@code originalFilename} vem com caminho completo
     * (ex.: {@code C:\Users\...\Cliente.pdf}), o que quebra a identificação por nome.
     */
    public static String extrairNomeBase(String nomeArquivo) {
        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            return nomeArquivo;
        }
        String limpo = nomeArquivo.replace('\u0000', ' ').trim();
        String soNome = limpo;
        int barra = Math.max(limpo.lastIndexOf('/'), limpo.lastIndexOf('\\'));
        if (barra >= 0 && barra < limpo.length() - 1) {
            soNome = limpo.substring(barra + 1);
        } else {
            try {
                Path path = Paths.get(limpo);
                if (path.getFileName() != null) {
                    soNome = path.getFileName().toString();
                }
            } catch (Exception ignored) {
                // mantém limpo
            }
        }
        return soNome.trim();
    }
}
