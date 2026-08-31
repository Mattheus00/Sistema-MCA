package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.LivroCaixaCategoriaRequestDTO;
import com.pucminas.sgi.dto.response.LivroCaixaCategoriaResponseDTO;
import com.pucminas.sgi.entity.LivroCaixaCategoria;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.LivroCaixaCategoriaRepository;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LivroCaixaCategoriaService {

    private final LivroCaixaCategoriaRepository categoriaRepository;
    private final LivroCaixaMovimentacaoRepository movimentacaoRepository;
    private final StaffAccessService staffAccessService;

    public LivroCaixaCategoriaService(LivroCaixaCategoriaRepository categoriaRepository,
                                      LivroCaixaMovimentacaoRepository movimentacaoRepository,
                                      StaffAccessService staffAccessService) {
        this.categoriaRepository = categoriaRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.staffAccessService = staffAccessService;
    }

    @Transactional(readOnly = true)
    public List<LivroCaixaCategoriaResponseDTO> listar(UUID usuarioId, boolean incluirInativas) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        List<LivroCaixaCategoria> lista = incluirInativas
                ? categoriaRepository.findAll()
                : categoriaRepository.findByAtivoTrueOrderByTipoAscNomeAsc();
        return lista.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LivroCaixaCategoriaResponseDTO criar(UUID usuarioId, LivroCaixaCategoriaRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        categoriaRepository.findByNomeIgnoreCaseAndTipo(dto.getNome().trim(), dto.getTipo())
                .ifPresent(c -> {
                    throw new BusinessRuleException("Já existe categoria com este nome para o tipo informado.");
                });
        LivroCaixaCategoria salva = categoriaRepository.save(LivroCaixaCategoria.builder()
                .nome(dto.getNome().trim())
                .tipo(dto.getTipo())
                .ativo(true)
                .build());
        return toDto(salva);
    }

    @Transactional
    public LivroCaixaCategoriaResponseDTO atualizar(UUID usuarioId, UUID id, LivroCaixaCategoriaRequestDTO dto) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaCategoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria Livro Caixa", id));
        categoria.setNome(dto.getNome().trim());
        categoria.setTipo(dto.getTipo());
        return toDto(categoriaRepository.save(categoria));
    }

    @Transactional
    public void desativar(UUID usuarioId, UUID id) {
        staffAccessService.assertPodeAcessarLivroCaixa(usuarioId);
        LivroCaixaCategoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria Livro Caixa", id));
        categoria.setAtivo(false);
        categoriaRepository.save(categoria);
    }

    @Transactional(readOnly = true)
    public LivroCaixaCategoria requireAtiva(UUID categoriaId) {
        LivroCaixaCategoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria Livro Caixa", categoriaId));
        if (!categoria.isAtivo()) {
            throw new BusinessRuleException("Categoria inativa.");
        }
        if (categoria.getTipo() == null) {
            throw new BusinessRuleException("Categoria inválida.");
        }
        return categoria;
    }

    @Transactional(readOnly = true)
    public boolean possuiMovimentacoes(UUID categoriaId) {
        return movimentacaoRepository.existsByCategoriaId(categoriaId);
    }

    private LivroCaixaCategoriaResponseDTO toDto(LivroCaixaCategoria c) {
        return LivroCaixaCategoriaResponseDTO.builder()
                .id(c.getId())
                .nome(c.getNome())
                .tipo(c.getTipo())
                .ativo(c.isAtivo())
                .criadoEm(c.getCriadoEm())
                .build();
    }
}
