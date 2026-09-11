package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.util.DocumentoUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
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
@Slf4j
@RequiredArgsConstructor
public class ClientesRelatorioImportRunner implements CommandLineRunner {
    private static final String ARQUIVO = "clientes-relatorio.csv";

    private final ClienteRepository clienteRepository;

    @Value("${sgi.import.clientes-dir:}")
    private String clientesDir = "";


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
                    List<String> cols = CsvLinhaParser.parse(line);
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

                    String celular = TelefoneClienteUtil.normalizarCelularImportacao(celularRaw);
                    String cpfCnpj = DocumentoUtil.normalizarCpfCnpjImportacao(cpfCnpjRaw);
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
}
