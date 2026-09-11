package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Importa clientes de {@code clientes-relatorio.csv} no diretório externo configurado
 * (codigo,nome,celular,email,cpf_cnpj). Idempotente por código.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "sgi.import.enabled", havingValue = "true")
public class ClientesRelatorioImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClientesRelatorioImportRunner.class);
    private static final String ARQUIVO = "clientes-relatorio.csv";

    private final ClienteRepository clienteRepository;

    @Value("${sgi.import.clientes-dir:}")
    private String clientesDir = "";

    public ClientesRelatorioImportRunner(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        importarSeExistirArquivo();
    }

    @Transactional
    public void importarSeExistirArquivo() {
        try {
            if (clientesDir == null || clientesDir.isBlank()) {
                log.debug("Importação de clientes desativada: sgi.import.clientes-dir vazio.");
                return;
            }
            Path diretorio = Path.of(clientesDir);
            Path arquivo = diretorio.resolve(ARQUIVO);
            if (!Files.isDirectory(diretorio) || !Files.isRegularFile(arquivo)) {
                log.debug("Importação de clientes ignorada: diretório ou arquivo externo inexistente.");
                return;
            }

            int inseridos = 0;
            int ignorados = 0;
            int erros = 0;
            Set<String> codigosUsados = new HashSet<>();

            try (var reader = Files.newBufferedReader(arquivo, StandardCharsets.UTF_8)) {
                String line = reader.readLine();
                if (line == null) {
                    return;
                }

                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) {
                        continue;
                    }
                    List<String> cols = parseCsvLine(line);
                    if (cols.size() < 2) {
                        erros++;
                        continue;
                    }
                    String codigo = normalizarCodigo(cols.get(0));
                    String nome = cols.get(1).trim();
                    String celularRaw = cols.size() > 2 ? cols.get(2).trim() : "";
                    String email = cols.size() > 3 ? normalizarEmail(cols.get(3)) : null;
                    String cpfCnpjRaw = cols.size() > 4 ? cols.get(4).trim() : "";

                    if (codigo == null || nome.isEmpty()) {
                        erros++;
                        continue;
                    }
                    if (!codigosUsados.add(codigo)) {
                        log.warn("Código duplicado no CSV ignorado: {} ({})", codigo, nome);
                        erros++;
                        continue;
                    }
                    if (clienteRepository.findByCodigo(codigo).isPresent()) {
                        ignorados++;
                        continue;
                    }

                    String celular = normalizarCelularImport(celularRaw);
                    String cpfCnpj = normalizarCpfCnpjImport(cpfCnpjRaw);
                    if (cpfCnpj == null) {
                        log.warn("CPF/CNPJ ausente ou invalido para codigo {} ({}), linha ignorada.", codigo, nome);
                        erros++;
                        continue;
                    }

                    Cliente c = Cliente.builder()
                            .codigo(codigo)
                            .nome(nome)
                            .cpfCnpj(cpfCnpj)
                            .celular(celular)
                            .email(email)
                            .statusCliente(StatusCliente.ATIVO)
                            .saldoDevedor(BigDecimal.ZERO)
                            .criadoEm(LocalDateTime.now())
                            .atualizadoEm(LocalDateTime.now())
                            .build();
                    clienteRepository.save(c);
                    inseridos++;
                }
            }

            log.info("Importação relatório MCA: {} clientes inseridos, {} já existentes, {} linhas com erro/ignoradas.",
                    inseridos, ignorados, erros);
        } catch (Exception e) {
            log.error("Erro ao importar clientes de " + ARQUIVO, e);
            throw new IllegalStateException("Falha na importação do relatório de clientes", e);
        }
    }

    private static List<String> parseCsvLine(String line) {
        List<String> cols = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
            } else if (ch == ',' && !inQuotes) {
                cols.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(ch);
            }
        }
        cols.add(cur.toString());
        return cols;
    }

    private static String normalizarCodigo(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase();
    }

    private static String normalizarEmail(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase();
    }

    private static String normalizarCelularImport(String raw) {
        if (raw == null || raw.isBlank() || raw.contains("( )")) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        if (digits.length() == 8 || digits.length() == 9) {
            return "31" + digits;
        }
        if (digits.length() == 10 || digits.length() == 11) {
            return digits;
        }
        if (digits.length() > 11) {
            return digits.substring(digits.length() - 11);
        }
        return null;
    }

    private static String normalizarCpfCnpjImport(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 11 || digits.length() == 14) {
            return digits;
        }
        return null;
    }
}
