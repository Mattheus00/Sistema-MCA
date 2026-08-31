package com.pucminas.sgi.service;

import com.pucminas.sgi.config.LivroCaixaProperties;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LivroCaixaAnexoStorageService {

    private static final Logger log = LoggerFactory.getLogger(LivroCaixaAnexoStorageService.class);

    private final LivroCaixaProperties properties;

    public LivroCaixaAnexoStorageService(LivroCaixaProperties properties) {
        this.properties = properties;
    }

    public record ArquivoSalvo(String nomeArmazenado, String hashSha256, long tamanho, String contentType) {
    }

    public ArquivoSalvo salvar(UUID movimentacaoId, UUID anexoId, MultipartFile arquivo) {
        validar(arquivo);
        try {
            Path base = resolverBase();
            Path dir = base.resolve(movimentacaoId.toString()).resolve(anexoId.toString()).normalize();
            if (!dir.startsWith(base)) {
                throw new BusinessRuleException("Caminho de armazenamento inválido.");
            }
            Files.createDirectories(dir);
            String extensao = extrairExtensao(arquivo.getOriginalFilename());
            String nomeArmazenado = UUID.randomUUID() + extensao;
            Path destino = dir.resolve(nomeArmazenado).normalize();
            if (!destino.startsWith(dir)) {
                throw new BusinessRuleException("Nome de arquivo inválido.");
            }
            byte[] bytes = arquivo.getBytes();
            Files.write(destino, bytes);
            return new ArquivoSalvo(
                    nomeArmazenado,
                    calcularSha256(bytes),
                    bytes.length,
                    arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream"
            );
        } catch (BusinessRuleException e) {
            throw e;
        } catch (IOException e) {
            log.error("Falha ao salvar anexo do Livro Caixa {}: {}", movimentacaoId, e.getMessage());
            throw new BusinessRuleException("Falha ao armazenar anexo.");
        }
    }

    public byte[] ler(UUID movimentacaoId, UUID anexoId, String nomeArmazenado) {
        try {
            Path base = resolverBase();
            Path arquivo = base.resolve(movimentacaoId.toString())
                    .resolve(anexoId.toString())
                    .resolve(nomeArmazenado)
                    .normalize();
            if (!arquivo.startsWith(base)) {
                throw new BusinessRuleException("Caminho de arquivo inválido.");
            }
            if (!Files.exists(arquivo)) {
                throw new BusinessRuleException("Arquivo não encontrado.");
            }
            return Files.readAllBytes(arquivo);
        } catch (BusinessRuleException e) {
            throw e;
        } catch (IOException e) {
            throw new BusinessRuleException("Falha ao ler anexo.");
        }
    }

    private void validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessRuleException("Arquivo vazio.");
        }
        if (arquivo.getSize() > properties.getMaxFileSizeBytes()) {
            throw new BusinessRuleException("Arquivo excede o tamanho máximo permitido.");
        }
        String contentType = arquivo.getContentType();
        if (contentType != null) {
            Set<String> permitidos = Arrays.stream(properties.getAllowedContentTypes().split(","))
                    .map(String::trim)
                    .collect(Collectors.toSet());
            if (!permitidos.contains(contentType)) {
                throw new BusinessRuleException("Tipo de arquivo não permitido.");
            }
        }
    }

    private Path resolverBase() throws IOException {
        Path base = Path.of(properties.getStoragePath()).toAbsolutePath().normalize();
        Files.createDirectories(base);
        return base;
    }

    private static String extrairExtensao(String nome) {
        if (nome == null || !nome.contains(".")) {
            return "";
        }
        return nome.substring(nome.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }

    private static String calcularSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new BusinessRuleException("Falha ao calcular hash do arquivo.");
        }
    }
}
