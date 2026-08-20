package com.pucminas.sgi.service;

import com.pucminas.sgi.config.DocumentoClienteProperties;
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
public class DocumentoClienteStorageService {

    private static final Logger log = LoggerFactory.getLogger(DocumentoClienteStorageService.class);

    private final DocumentoClienteProperties properties;

    public DocumentoClienteStorageService(DocumentoClienteProperties properties) {
        this.properties = properties;
    }

    public record ArquivoSalvo(String nomeArmazenado, String hashSha256, long tamanho, String contentType) {
    }

    public ArquivoSalvo salvar(UUID clienteId, UUID documentoId, MultipartFile arquivo) {
        validar(arquivo);
        try {
            Path base = resolverBase();
            Path clienteDir = base.resolve(clienteId.toString()).resolve(documentoId.toString()).normalize();
            if (!clienteDir.startsWith(base)) {
                throw new BusinessRuleException("Caminho de armazenamento inválido.");
            }
            Files.createDirectories(clienteDir);
            String extensao = extrairExtensao(arquivo.getOriginalFilename());
            String nomeArmazenado = UUID.randomUUID() + extensao;
            Path destino = clienteDir.resolve(nomeArmazenado).normalize();
            if (!destino.startsWith(clienteDir)) {
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
            log.error("Falha ao salvar documento do cliente {}: {}", clienteId, e.getMessage());
            throw new BusinessRuleException("Falha ao armazenar documento.");
        }
    }

    public byte[] ler(UUID clienteId, UUID documentoId, String nomeArmazenado) {
        try {
            Path base = resolverBase();
            Path arquivo = base.resolve(clienteId.toString())
                    .resolve(documentoId.toString())
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
            throw new BusinessRuleException("Falha ao ler documento.");
        }
    }

    private void validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessRuleException("Arquivo é obrigatório.");
        }
        if (arquivo.getSize() > properties.getMaxFileSizeBytes()) {
            throw new BusinessRuleException("Arquivo excede o tamanho máximo permitido.");
        }
        String contentType = arquivo.getContentType();
        if (contentType == null || !tiposPermitidos().contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BusinessRuleException("Tipo de arquivo não permitido.");
        }
    }

    private Set<String> tiposPermitidos() {
        return Arrays.stream(properties.getAllowedContentTypes().split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private Path resolverBase() throws IOException {
        Path base = Path.of(properties.getStoragePath()).toAbsolutePath().normalize();
        Files.createDirectories(base);
        return base;
    }

    private static String extrairExtensao(String nomeOriginal) {
        if (nomeOriginal == null || !nomeOriginal.contains(".")) {
            return "";
        }
        String ext = nomeOriginal.substring(nomeOriginal.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        if (ext.length() > 10) {
            return "";
        }
        return ext.replaceAll("[^a-z0-9.]", "");
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
