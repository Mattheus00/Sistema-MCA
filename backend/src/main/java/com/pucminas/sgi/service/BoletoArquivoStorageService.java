package com.pucminas.sgi.service;

import com.pucminas.sgi.config.BoletoEnvioProperties;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class BoletoArquivoStorageService {

    private static final Logger log = LoggerFactory.getLogger(BoletoArquivoStorageService.class);

    private final BoletoEnvioProperties properties;

    public BoletoArquivoStorageService(BoletoEnvioProperties properties) {
        this.properties = properties;
    }

    public record ArquivoSalvo(String nomeArmazenado, String hashSha256, long tamanho) {
    }

    public ArquivoSalvo salvar(UUID loteId, MultipartFile arquivo) {
        try {
            Path base = resolverBase();
            Path loteDir = base.resolve(loteId.toString()).normalize();
            if (!loteDir.startsWith(base)) {
                throw new BusinessRuleException("Caminho de armazenamento inválido.");
            }
            Files.createDirectories(loteDir);
            String nomeArmazenado = UUID.randomUUID() + ".pdf";
            Path destino = loteDir.resolve(nomeArmazenado).normalize();
            if (!destino.startsWith(loteDir)) {
                throw new BusinessRuleException("Nome de arquivo inválido.");
            }
            byte[] bytes = arquivo.getBytes();
            String hash = calcularSha256(bytes);
            Files.write(destino, bytes);
            return new ArquivoSalvo(nomeArmazenado, hash, bytes.length);
        } catch (BusinessRuleException e) {
            throw e;
        } catch (IOException e) {
            log.error("Falha ao salvar boleto do lote {}: {}", loteId, e.getMessage());
            throw new BusinessRuleException("Falha ao armazenar arquivo temporariamente.");
        }
    }

    public byte[] ler(UUID loteId, String nomeArmazenado) {
        try {
            Path arquivo = resolverArquivo(loteId, nomeArmazenado);
            if (!Files.exists(arquivo)) {
                throw new BusinessRuleException("Arquivo não encontrado.");
            }
            return Files.readAllBytes(arquivo);
        } catch (BusinessRuleException e) {
            throw e;
        } catch (IOException e) {
            throw new BusinessRuleException("Falha ao ler arquivo.");
        }
    }

    public InputStream abrirStream(UUID loteId, String nomeArmazenado) throws IOException {
        Path arquivo = resolverArquivo(loteId, nomeArmazenado);
        if (!Files.exists(arquivo)) {
            throw new BusinessRuleException("Arquivo não encontrado.");
        }
        return Files.newInputStream(arquivo);
    }

    public void removerLote(UUID loteId) {
        try {
            Path loteDir = resolverBase().resolve(loteId.toString()).normalize();
            if (Files.exists(loteDir) && loteDir.startsWith(resolverBase())) {
                try (var walk = Files.walk(loteDir)) {
                    walk.sorted((a, b) -> b.compareTo(a))
                            .forEach(path -> {
                                try {
                                    Files.deleteIfExists(path);
                                } catch (IOException e) {
                                    log.warn("Não foi possível remover {}: {}", path, e.getMessage());
                                }
                            });
                }
            }
        } catch (IOException e) {
            log.warn("Falha ao limpar arquivos do lote {}: {}", loteId, e.getMessage());
        }
    }

    private Path resolverArquivo(UUID loteId, String nomeArmazenado) {
        Path base = resolverBase();
        Path loteDir = base.resolve(loteId.toString()).normalize();
        Path arquivo = loteDir.resolve(nomeArmazenado).normalize();
        if (!arquivo.startsWith(loteDir) || !loteDir.startsWith(base)) {
            throw new BusinessRuleException("Acesso ao arquivo negado.");
        }
        return arquivo;
    }

    private Path resolverBase() {
        return Path.of(properties.getStoragePath()).toAbsolutePath().normalize();
    }

    public static String calcularSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
