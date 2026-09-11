package com.pucminas.sgi.bootstrap;

import java.util.ArrayList;
import java.util.List;

/**
 * Parser de linha delimitada com aspas, compartilhado pelos import runners.
 */
public final class CsvLinhaParser {

    private CsvLinhaParser() {
    }

    public static List<String> parse(String line) {
        return parse(line, ',');
    }

    public static List<String> parse(String line, char delimiter) {
        List<String> cols = new ArrayList<>();
        if (line == null) {
            return cols;
        }
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
            } else if (ch == delimiter && !inQuotes) {
                cols.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(ch);
            }
        }
        cols.add(cur.toString());
        return cols;
    }
}
