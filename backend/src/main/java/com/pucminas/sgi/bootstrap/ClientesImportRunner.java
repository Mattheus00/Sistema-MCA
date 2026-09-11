package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.util.DocumentoUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Importa clientes do arquivo data/clientes-importar.txt (formato legado).
 * Só executa com {@code sgi.import.enabled=true}. Prefira {@link ClientesRelatorioImportRunner}.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "sgi.import.enabled", havingValue = "true")
@Slf4j
@RequiredArgsConstructor
public class ClientesImportRunner implements CommandLineRunner {
    private static final String ARQUIVO = "data/clientes-importar.txt";

    private final ClienteRepository clienteRepository;


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
            int inseridos = 0;
            int ignorados = 0;
            int erros = 0;
            try (var reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;
                    if (line.startsWith("Página ")) continue;
                    int idxColon = line.indexOf(':');
                    if (idxColon <= 0) {
                        erros++;
                        continue;
                    }
                    String nome = line.substring(0, idxColon).trim();
                    String rest = line.substring(idxColon + 1).trim();
                    java.util.List<String> partes = CsvLinhaParser.parse(rest, '|');
                    String cpfCnpj = DocumentoUtil.apenasDigitos(partes.isEmpty() ? rest : partes.get(0).trim());
                    String telefone = partes.size() > 1 ? TelefoneClienteUtil.apenasDigitos(partes.get(1).trim()) : null;
                    if (cpfCnpj == null || cpfCnpj.isEmpty() || nome.isEmpty()) {
                        erros++;
                        continue;
                    }
                    if (clienteRepository.findByCpfCnpj(cpfCnpj).isPresent()) {
                        ignorados++;
                        continue;
                    }
                    Cliente c = Cliente.builder()
                            .nome(nome)
                            .cpfCnpj(cpfCnpj)
                            .telefone(telefone == null || telefone.isEmpty() ? null : telefone)
                            .statusCliente(StatusCliente.ATIVO)
                            .saldoDevedor(BigDecimal.ZERO)
                            .criadoEm(LocalDateTime.now())
                            .atualizadoEm(LocalDateTime.now())
                            .build();
                    clienteRepository.save(c);
                    inseridos++;
                }
            }
            if (inseridos > 0 || ignorados > 0 || erros > 0) {
                log.info("Importação de clientes: {} inseridos, {} já existentes, {} linhas ignoradas/erro.", inseridos, ignorados, erros);
            }
        } catch (Exception e) {
            log.error("Erro ao importar clientes de " + ARQUIVO, e);
        }
    }
}
