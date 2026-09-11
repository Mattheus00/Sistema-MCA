package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.TarefaChecklistItemResponseDTO;
import com.pucminas.sgi.dto.response.TarefaHistoricoResponseDTO;
import com.pucminas.sgi.dto.response.TarefaResponseDTO;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.TarefaChecklistItem;
import com.pucminas.sgi.entity.TarefaHistorico;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.repository.TarefaChecklistRepository;
import com.pucminas.sgi.repository.TarefaHistoricoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TarefaMapper {

    private final TarefaChecklistRepository checklistRepository;
    private final TarefaHistoricoRepository historicoRepository;
    private final Clock clock;

    public TarefaResponseDTO toDto(Tarefa tarefa, boolean detalhe) {
        List<TarefaChecklistItem> items = detalhe
                ? checklistRepository.findByTarefaIdOrderByOrdemAsc(tarefa.getId())
                : tarefa.getChecklist() != null ? tarefa.getChecklist() : List.of();
        if (!detalhe && (items == null || items.isEmpty())) {
            long total = checklistRepository.countByTarefaId(tarefa.getId());
            long concluidos = checklistRepository.countByTarefaIdAndConcluidoTrue(tarefa.getId());
            return baseDto(tarefa)
                    .checklistTotal((int) total)
                    .checklistConcluidos((int) concluidos)
                    .build();
        }
        int concluidos = (int) items.stream().filter(TarefaChecklistItem::isConcluido).count();
        TarefaResponseDTO.TarefaResponseDTOBuilder builder = baseDto(tarefa)
                .checklistTotal(items.size())
                .checklistConcluidos(concluidos)
                .checklist(items.stream().map(this::toChecklistDto).collect(Collectors.toList()));
        if (detalhe) {
            builder.historico(historicoRepository.findByTarefaIdOrderByCriadoEmDesc(tarefa.getId()).stream()
                    .map(this::toHistoricoDto)
                    .collect(Collectors.toList()));
        }
        return builder.build();
    }

    private TarefaResponseDTO.TarefaResponseDTOBuilder baseDto(Tarefa tarefa) {
        boolean atrasada = tarefa.getDataVencimento() != null
                && tarefa.getDataVencimento().isBefore(LocalDate.now(clock))
                && tarefa.getStatus() != StatusTarefa.CONCLUIDO;
        return TarefaResponseDTO.builder()
                .id(tarefa.getId())
                .titulo(tarefa.getTitulo())
                .descricao(tarefa.getDescricao())
                .status(tarefa.getStatus())
                .prioridade(tarefa.getPrioridade())
                .responsavelId(tarefa.getResponsavel() != null
                        ? tarefa.getResponsavel().getUsuarioId()
                        : tarefa.getResponsavelId())
                .responsavelNome(tarefa.getResponsavel() != null ? tarefa.getResponsavel().getNome() : null)
                .criadoPorId(tarefa.getCriadoPor() != null
                        ? tarefa.getCriadoPor().getUsuarioId()
                        : tarefa.getCriadoPorId())
                .criadoPorNome(tarefa.getCriadoPor() != null ? tarefa.getCriadoPor().getNome() : null)
                .dataInicio(tarefa.getDataInicio())
                .dataVencimento(tarefa.getDataVencimento())
                .categoria(tarefa.getCategoria())
                .ordemKanban(tarefa.getOrdemKanban())
                .observacoes(tarefa.getObservacoes())
                .concluidoEm(tarefa.getConcluidoEm())
                .criadoEm(tarefa.getCriadoEm())
                .atualizadoEm(tarefa.getAtualizadoEm())
                .atrasada(atrasada);
    }

    public TarefaChecklistItemResponseDTO toChecklistDto(TarefaChecklistItem item) {
        return TarefaChecklistItemResponseDTO.builder()
                .id(item.getId())
                .descricao(item.getDescricao())
                .concluido(item.isConcluido())
                .ordem(item.getOrdem())
                .criadoEm(item.getCriadoEm())
                .atualizadoEm(item.getAtualizadoEm())
                .build();
    }

    private TarefaHistoricoResponseDTO toHistoricoDto(TarefaHistorico h) {
        return TarefaHistoricoResponseDTO.builder()
                .id(h.getId())
                .usuarioId(h.getUsuario() != null ? h.getUsuario().getUsuarioId() : h.getUsuarioId())
                .usuarioNome(h.getUsuario() != null ? h.getUsuario().getNome() : null)
                .acao(h.getAcao())
                .descricao(h.getDescricao())
                .criadoEm(h.getCriadoEm())
                .build();
    }
}
