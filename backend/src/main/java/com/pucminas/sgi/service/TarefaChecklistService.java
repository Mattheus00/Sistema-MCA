package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.TarefaChecklistItemRequestDTO;
import com.pucminas.sgi.dto.response.TarefaChecklistItemResponseDTO;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.TarefaChecklistItem;
import com.pucminas.sgi.entity.TarefaHistorico;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.TarefaMapper;
import com.pucminas.sgi.repository.TarefaChecklistRepository;
import com.pucminas.sgi.repository.TarefaHistoricoRepository;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TarefaChecklistService {

    private final TarefaRepository tarefaRepository;
    private final TarefaChecklistRepository checklistRepository;
    private final TarefaHistoricoRepository historicoRepository;
    private final StaffAccessService staffAccessService;
    private final TarefaMapper tarefaMapper;

    @Transactional
    public TarefaChecklistItemResponseDTO adicionar(UUID usuarioId, UUID tarefaId, TarefaChecklistItemRequestDTO dto) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        int ordem = (int) checklistRepository.countByTarefaId(tarefaId);
        TarefaChecklistItem item = checklistRepository.save(TarefaChecklistItem.builder()
                .tarefa(tarefa)
                .descricao(dto.getDescricao().trim())
                .ordem(ordem)
                .concluido(false)
                .build());
        registrarHistorico(tarefa, usuario, "CHECKLIST",
                usuario.getNome() + " adicionou item do checklist: " + item.getDescricao());
        return tarefaMapper.toChecklistDto(item);
    }

    @Transactional
    public TarefaChecklistItemResponseDTO alternar(UUID usuarioId, UUID tarefaId, UUID itemId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        TarefaChecklistItem item = requireItemDaTarefa(tarefaId, itemId);
        item.setConcluido(!item.isConcluido());
        item = checklistRepository.save(item);
        registrarHistorico(tarefa, usuario, "CHECKLIST",
                usuario.getNome() + (item.isConcluido() ? " concluiu" : " reabriu")
                        + " item do checklist: " + item.getDescricao());
        return tarefaMapper.toChecklistDto(item);
    }

    @Transactional
    public void remover(UUID usuarioId, UUID tarefaId, UUID itemId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        TarefaChecklistItem item = requireItemDaTarefa(tarefaId, itemId);
        checklistRepository.delete(item);
        registrarHistorico(tarefa, usuario, "CHECKLIST",
                usuario.getNome() + " removeu item do checklist: " + item.getDescricao());
    }

    private TarefaChecklistItem requireItemDaTarefa(UUID tarefaId, UUID itemId) {
        TarefaChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item do checklist", itemId));
        if (!tarefaId.equals(item.getTarefaId())) {
            throw new ResourceNotFoundException("Item do checklist", itemId);
        }
        return item;
    }

    private Tarefa carregarComAcesso(Usuario usuario, UUID tarefaId) {
        Tarefa tarefa = tarefaRepository.findByIdDetalhado(tarefaId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa", tarefaId));
        if (!staffAccessService.podeGerenciarEquipeTarefas(usuario)
                && !usuario.getUsuarioId().equals(tarefa.getResponsavelId())) {
            throw new AccessDeniedBusinessException("Sem permissão para acessar esta tarefa.");
        }
        return tarefa;
    }

    private void registrarHistorico(Tarefa tarefa, Usuario usuario, String acao, String descricao) {
        historicoRepository.save(TarefaHistorico.builder()
                .tarefa(tarefa)
                .usuario(usuario)
                .acao(acao)
                .descricao(descricao)
                .build());
    }
}
