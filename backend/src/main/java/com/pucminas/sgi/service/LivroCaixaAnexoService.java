package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.LivroCaixaAnexoResponseDTO;
import com.pucminas.sgi.entity.LivroCaixaAnexo;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.LivroCaixaAnexoRepository;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
public class LivroCaixaAnexoService {

    private final LivroCaixaAnexoRepository anexoRepository;
    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final LivroCaixaAnexoStorageService storageService;
    private final StaffAccessService staffAccessService;
    private final UsuarioRepository usuarioRepository;

    public LivroCaixaAnexoService(LivroCaixaAnexoRepository anexoRepository,
                                  LivroCaixaMovimentacaoRepository movimentacaoRepository,
                                  LivroCaixaAnexoStorageService storageService,
                                  StaffAccessService staffAccessService,
                                  UsuarioRepository usuarioRepository) {
        this.anexoRepository = anexoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.storageService = storageService;
        this.staffAccessService = staffAccessService;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public LivroCaixaAnexoResponseDTO anexar(UUID usuarioId, UUID movimentacaoId, MultipartFile arquivo) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaMovimentacao mov = movimentacaoRepository.findById(movimentacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação Livro Caixa", movimentacaoId));
        UUID anexoId = UUID.randomUUID();
        LivroCaixaAnexoStorageService.ArquivoSalvo salvo =
                storageService.salvar(movimentacaoId, anexoId, arquivo);
        String usuarioLogin = usuarioRepository.findById(usuarioId)
                .map(u -> u.getTelefone())
                .orElse(usuarioId.toString());
        LivroCaixaAnexo anexo = anexoRepository.save(LivroCaixaAnexo.builder()
                .id(anexoId)
                .movimentacao(mov)
                .nomeOriginal(arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename() : "anexo")
                .nomeArmazenado(salvo.nomeArmazenado())
                .hashSha256(salvo.hashSha256())
                .tamanhoBytes(salvo.tamanho())
                .contentType(salvo.contentType())
                .enviadoPor(usuarioLogin)
                .build());
        return toDto(anexo);
    }

    @Transactional(readOnly = true)
    public byte[] download(UUID usuarioId, UUID movimentacaoId, UUID anexoId) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaAnexo anexo = anexoRepository.findById(anexoId)
                .orElseThrow(() -> new ResourceNotFoundException("Anexo Livro Caixa", anexoId));
        if (!movimentacaoId.equals(anexo.getMovimentacaoId())) {
            throw new ResourceNotFoundException("Anexo Livro Caixa", anexoId);
        }
        return storageService.ler(movimentacaoId, anexoId, anexo.getNomeArmazenado());
    }

    @Transactional(readOnly = true)
    public LivroCaixaAnexo requireAnexo(UUID movimentacaoId, UUID anexoId) {
        LivroCaixaAnexo anexo = anexoRepository.findById(anexoId)
                .orElseThrow(() -> new ResourceNotFoundException("Anexo Livro Caixa", anexoId));
        if (!movimentacaoId.equals(anexo.getMovimentacaoId())) {
            throw new ResourceNotFoundException("Anexo Livro Caixa", anexoId);
        }
        return anexo;
    }

    private LivroCaixaAnexoResponseDTO toDto(LivroCaixaAnexo anexo) {
        return LivroCaixaAnexoResponseDTO.builder()
                .id(anexo.getId())
                .nomeOriginal(anexo.getNomeOriginal())
                .tamanhoBytes(anexo.getTamanhoBytes())
                .contentType(anexo.getContentType())
                .enviadoPor(anexo.getEnviadoPor())
                .criadoEm(anexo.getCriadoEm())
                .build();
    }
}
