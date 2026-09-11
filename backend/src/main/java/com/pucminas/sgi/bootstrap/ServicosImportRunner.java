package com.pucminas.sgi.bootstrap;

import com.pucminas.sgi.entity.Servico;
import com.pucminas.sgi.repository.ServicoRepository;
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

/**
 * Importa serviços do arquivo data/servicos-importar.txt (formato: "NOME|VALOR_REAIS|OBSERVACAO").
 * Valor em reais; no banco é armazenado em centavos (valorPadrao). Pula linhas vazias, comentários (#)
 * e serviços já existentes por nome. Executa após o DataSeeder.
 */
@Component
@Order(3)
@ConditionalOnProperty(name = "sgi.import.enabled", havingValue = "true")
@Slf4j
@RequiredArgsConstructor
public class ServicosImportRunner implements CommandLineRunner {
    private static final String ARQUIVO = "data/servicos-importar.txt";

    private final ServicoRepository servicoRepository;


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
                    if (line.isEmpty() || line.startsWith("#")) continue;
                    java.util.List<String> partes = CsvLinhaParser.parse(line, '|');
                    if (partes.size() < 2) {
                        erros++;
                        continue;
                    }
                    String nome = partes.get(0).trim();
                    if (nome.isEmpty()) {
                        erros++;
                        continue;
                    }
                    if (servicoRepository.findByNome(nome).isPresent()) {
                        ignorados++;
                        continue;
                    }
                    BigDecimal valorReais;
                    try {
                        valorReais = new BigDecimal(partes.get(1).trim().replace(",", "."));
                    } catch (NumberFormatException e) {
                        erros++;
                        continue;
                    }
                    // Converte reais para centavos (entidade usa centavos)
                    BigDecimal valorCentavos = valorReais.multiply(BigDecimal.valueOf(100)).setScale(0, java.math.RoundingMode.HALF_UP);
                    String observacao = partes.size() > 2 ? partes.get(2).trim() : "";
                    if (observacao.isEmpty()) observacao = null;

                    Servico s = Servico.builder()
                            .nome(nome)
                            .descricao(observacao)
                            .valorPadrao(valorCentavos)
                            .ativo(true)
                            .build();
                    servicoRepository.save(s);
                    inseridos++;
                }
            }
            if (inseridos > 0 || ignorados > 0 || erros > 0) {
                log.info("Importação de serviços: {} inseridos, {} já existentes, {} linhas ignoradas/erro.", inseridos, ignorados, erros);
            }
        } catch (Exception e) {
            log.error("Erro ao importar serviços de " + ARQUIVO, e);
        }
    }
}
