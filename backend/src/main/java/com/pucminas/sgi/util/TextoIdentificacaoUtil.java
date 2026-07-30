package com.pucminas.sgi.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

public final class TextoIdentificacaoUtil {

    private static final Set<String> STOPWORDS = Set.of(
            "boleto", "boletos", "mensalidade", "mensalidades", "cobranca", "cobrancas",
            "honorario", "honorarios", "pdf", "arquivo", "pagamento",
            "janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto",
            "setembro", "outubro", "novembro", "dezembro",
            "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
            "ltda", "ltda.", "me", "epp", "cia", "sa", "s/a", "s.a", "eireli", "limitada", "filial"
    );

    private TextoIdentificacaoUtil() {
    }

    public static String normalizarParaComparacao(String texto) {
        if (texto == null) {
            return "";
        }
        String semExtensao = texto.replaceAll("(?i)\\.pdf$", "");
        String lower = semExtensao.toLowerCase(Locale.ROOT);
        String semAcento = Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String substituido = semAcento.replaceAll("[_\\-]+", " ");
        String limpo = substituido.replaceAll("[^a-z0-9\\s]", " ");
        String colapsado = limpo.replaceAll("\\s+", " ").trim();
        StringBuilder sb = new StringBuilder();
        for (String token : colapsado.split(" ")) {
            if (token.isBlank() || STOPWORDS.contains(token) || token.matches("\\d+")) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(token);
        }
        return sb.toString();
    }

    public static double similaridadeToken(String a, String b) {
        if (a == null || b == null || a.isBlank() || b.isBlank()) {
            return 0;
        }
        if (a.equals(b)) {
            return 1.0;
        }
        if (a.contains(b) || b.contains(a)) {
            return Math.max(0.85, prefixoInicial(a, b));
        }
        String[] tokensA = a.split(" ");
        String[] tokensB = b.split(" ");
        int matches = 0;
        for (String ta : tokensA) {
            for (String tb : tokensB) {
                if (ta.equals(tb) || ta.contains(tb) || tb.contains(ta)) {
                    matches++;
                    break;
                }
            }
        }
        int max = Math.max(tokensA.length, tokensB.length);
        return max == 0 ? 0 : (double) matches / max;
    }

    /** Quando o nome do arquivo é prefixo do nome do cliente (caso comum em boletos). */
    private static double prefixoInicial(String arquivo, String cliente) {
        String menor = arquivo.length() <= cliente.length() ? arquivo : cliente;
        String maior = arquivo.length() > cliente.length() ? arquivo : cliente;
        if (!maior.startsWith(menor)) {
            return 0.85;
        }
        if (menor.isBlank()) {
            return 0;
        }
        String[] tokensMenor = menor.split(" ");
        String[] tokensMaior = maior.split(" ");
        if (tokensMenor.length >= tokensMaior.length) {
            return 0.85;
        }
        return Math.min(0.95, 0.80 + (0.05 * tokensMenor.length));
    }
}
