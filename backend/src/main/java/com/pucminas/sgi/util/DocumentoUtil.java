package com.pucminas.sgi.util;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DocumentoUtil {

    private static final Pattern CPF_CNPJ_DIGITS = Pattern.compile("(?<!\\d)(\\d{14}|\\d{11})(?!\\d)");

    private DocumentoUtil() {
    }

    public static String apenasDigitos(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        String digits = valor.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }

    public static String normalizarDocumento(String valor) {
        return apenasDigitos(valor);
    }

    public static List<String> extrairDocumentosDoTexto(String texto) {
        List<String> encontrados = new ArrayList<>();
        if (texto == null || texto.isBlank()) {
            return encontrados;
        }
        Matcher matcher = CPF_CNPJ_DIGITS.matcher(texto);
        while (matcher.find()) {
            String doc = matcher.group(1);
            if (!encontrados.contains(doc)) {
                encontrados.add(doc);
            }
        }
        return encontrados;
    }

    public static String mascararDocumento(String cpfCnpj) {
        String digits = apenasDigitos(cpfCnpj);
        if (digits == null) {
            return "-";
        }
        if (digits.length() == 11) {
            return "***." + digits.substring(3, 6) + "." + digits.substring(6, 9) + "-**";
        }
        if (digits.length() == 14) {
            return digits.substring(0, 2) + "." + digits.substring(2, 5) + "." + digits.substring(5, 8)
                    + "/****-" + digits.substring(12);
        }
        return "***";
    }
}
