package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Substitui o cadastro de clientes pelo arquivo {@code data/clientes-relatorio.csv}
 * (codigo,nome,celular,email,cpf_cnpj). Reimporta apenas quando o conteúdo do CSV mudar.
 */
@Component
@Order(2)
public class ClientesRelatorioImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClientesRelatorioImportRunner.class);
    private static final String ARQUIVO = "data/clientes-relatorio.csv";
    private static final String HASH_MARKER = "data/.clientes-relatorio-hash";

    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final PagamentoRepository pagamentoRepository;

    public ClientesRelatorioImportRunner(ClienteRepository clienteRepository,
                                           DividaRepository dividaRepository,
                                           PagamentoRepository pagamentoRepository) {
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.pagamentoRepository = pagamentoRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        importarSeExistirArquivo();
    }

    @Transactional
    public void importarSeExistirArquivo() {
        try {
            var resource = new ClassPathResource(ARQUIVO);
            if (!resource.exists()) {
                return;
            }

            String hashAtual;
            try (InputStream in = resource.getInputStream()) {
                hashAtual = DigestUtils.md5DigestAsHex(in);
            }
            if (hashJaImportado(hashAtual)) {
                log.debug("Relatório de clientes já importado (hash inalterado).");
                return;
            }

            pagamentoRepository.deleteAll();
            dividaRepository.deleteAll();
            clienteRepository.deleteAll();
            pagamentoRepository.flush();
            dividaRepository.flush();
            clienteRepository.flush();

            int inseridos = 0;
            int erros = 0;
            Set<String> codigosUsados = new HashSet<>();

            try (var reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
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

            salvarHashImportado(hashAtual);
            log.info("Importação relatório MCA: {} clientes inseridos, {} linhas com erro/ignoradas.", inseridos, erros);
        } catch (Exception e) {
            log.error("Erro ao importar clientes de " + ARQUIVO, e);
            throw new IllegalStateException("Falha na importação do relatório de clientes", e);
        }
    }

    private boolean hashJaImportado(String hashAtual) throws Exception {
        Path marker = Paths.get(HASH_MARKER);
        if (!Files.exists(marker)) {
            return false;
        }
        String salvo = Files.readString(marker, StandardCharsets.UTF_8).trim();
        return hashAtual.equals(salvo);
    }

    private void salvarHashImportado(String hash) throws Exception {
        Path marker = Paths.get(HASH_MARKER);
        Files.createDirectories(marker.getParent());
        Files.writeString(marker, hash, StandardCharsets.UTF_8);
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
