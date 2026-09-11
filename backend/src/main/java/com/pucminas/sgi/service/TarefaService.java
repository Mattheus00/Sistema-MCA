package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.MoverTarefaRequestDTO;
import com.pucminas.sgi.dto.request.TarefaRequestDTO;
import com.pucminas.sgi.dto.response.*;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.TarefaChecklistItem;
import com.pucminas.sgi.entity.TarefaHistorico;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.TarefaMapper;
import com.pucminas.sgi.repository.TarefaChecklistRepository;
import com.pucminas.sgi.repository.TarefaHistoricoRepository;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.repository.TarefaSpecs;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class TarefaService {

    private final TarefaRepository tarefaRepository;
    private final TarefaChecklistRepository checklistRepository;
    private final TarefaHistoricoRepository historicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final StaffAccessService staffAccessService;
    private final TarefaMapper tarefaMapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Page<TarefaResponseDTO> listar(UUID usuarioId,
                                          UUID responsavelIdFiltro,
                                          StatusTarefa status,
                                          PrioridadeTarefa prioridade,
                                          String categoria,
                                          String busca,
                                          LocalDate dataInicio,
                                          LocalDate dataFim,
                                          Boolean apenasAtrasadas,
                                          boolean visaoEquipe,
                                          Pageable pageable) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        UUID responsavelEfetivo = resolverFiltroResponsavel(usuario, responsavelIdFiltro, visaoEquipe);
        return tarefaRepository.findAll(
                TarefaSpecs.filtrar(responsavelEfetivo, status, prioridade, categoria, busca,
                        dataInicio, dataFim, apenasAtrasadas),
                pageable
        ).map(t -> tarefaMapper.toDto(t, false));
    }

    @Transactional(readOnly = true)
    public List<TarefaResponseDTO> listarKanban(UUID usuarioId,
                                                UUID responsavelIdFiltro,
                                                boolean visaoEquipe,
                                                StatusTarefa status,
                                                PrioridadeTarefa prioridade,
                                                String categoria,
                                                String busca) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        UUID responsavelEfetivo = resolverFiltroResponsavel(usuario, responsavelIdFiltro, visaoEquipe);
        return tarefaRepository.findAll(
                TarefaSpecs.filtrar(responsavelEfetivo, status, prioridade, categoria, busca, null, null, null),
                Sort.by(Sort.Order.asc("status"), Sort.Order.asc("ordemKanban"), Sort.Order.desc("criadoEm"))
        ).stream().map(t -> tarefaMapper.toDto(t, false)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TarefaResponseDTO detalhar(UUID usuarioId, UUID tarefaId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        return tarefaMapper.toDto(tarefa, true);
    }

    @Transactional
    public TarefaResponseDTO criar(UUID usuarioId, TarefaRequestDTO dto) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Usuario responsavel = resolverResponsavelCriacao(usuario, dto.getResponsavelId());
        StatusTarefa status = dto.getStatus() != null ? dto.getStatus() : StatusTarefa.A_FAZER;
        PrioridadeTarefa prioridade = dto.getPrioridade() != null ? dto.getPrioridade() : PrioridadeTarefa.MEDIA;

        int proximaOrdem = nextOrdem(status, responsavel.getUsuarioId());
        Tarefa tarefa = Tarefa.builder()
                .titulo(dto.getTitulo().trim())
                .descricao(blankToNull(dto.getDescricao()))
                .status(status)
                .prioridade(prioridade)
                .responsavel(responsavel)
                .criadoPor(usuario)
                .dataInicio(dto.getDataInicio())
                .dataVencimento(dto.getDataVencimento())
                .categoria(blankToNull(dto.getCategoria()))
                .observacoes(blankToNull(dto.getObservacoes()))
                .ordemKanban(proximaOrdem)
                .build();

        if (status == StatusTarefa.CONCLUIDO) {
            tarefa.setConcluidoEm(LocalDateTime.now(clock));
        }

        tarefa = tarefaRepository.save(tarefa);

        if (dto.getChecklistItens() != null) {
            int ordem = 0;
            for (String item : dto.getChecklistItens()) {
                if (item == null || item.isBlank()) {
                    continue;
                }
                TarefaChecklistItem checklist = TarefaChecklistItem.builder()
                        .tarefa(tarefa)
                        .descricao(item.trim())
                        .ordem(ordem++)
                        .concluido(false)
                        .build();
                tarefa.getChecklist().add(checklist);
            }
            tarefaRepository.save(tarefa);
        }

        registrarHistorico(tarefa, usuario, "CRIAR",
                "Tarefa criada por " + usuario.getNome());
        return tarefaMapper.toDto(tarefaRepository.findByIdDetalhado(tarefa.getId()).orElse(tarefa), true);
    }

    @Transactional
    public TarefaResponseDTO atualizar(UUID usuarioId, UUID tarefaId, TarefaRequestDTO dto) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);

        if (dto.getTitulo() != null && !dto.getTitulo().isBlank()
                && !Objects.equals(tarefa.getTitulo(), dto.getTitulo().trim())) {
            registrarHistorico(tarefa, usuario, "TITULO",
                    "Título alterado para \"" + dto.getTitulo().trim() + "\"");
            tarefa.setTitulo(dto.getTitulo().trim());
        }
        if (dto.getDescricao() != null) {
            tarefa.setDescricao(blankToNull(dto.getDescricao()));
        }
        if (dto.getObservacoes() != null) {
            tarefa.setObservacoes(blankToNull(dto.getObservacoes()));
        }
        if (dto.getCategoria() != null) {
            tarefa.setCategoria(blankToNull(dto.getCategoria()));
        }
        if (!Objects.equals(tarefa.getDataInicio(), dto.getDataInicio())) {
            tarefa.setDataInicio(dto.getDataInicio());
        }
        if (!Objects.equals(tarefa.getDataVencimento(), dto.getDataVencimento())) {
            registrarHistorico(tarefa, usuario, "PRAZO",
                    usuario.getNome() + " alterou o prazo para "
                            + (dto.getDataVencimento() != null ? dto.getDataVencimento() : "sem prazo"));
            tarefa.setDataVencimento(dto.getDataVencimento());
        }
        if (dto.getPrioridade() != null && dto.getPrioridade() != tarefa.getPrioridade()) {
            registrarHistorico(tarefa, usuario, "PRIORIDADE",
                    "Prioridade alterada de " + tarefa.getPrioridade() + " para " + dto.getPrioridade());
            tarefa.setPrioridade(dto.getPrioridade());
        }
        if (dto.getStatus() != null && dto.getStatus() != tarefa.getStatus()) {
            StatusTarefa anterior = tarefa.getStatus();
            tarefa.setStatus(dto.getStatus());
            if (dto.getStatus() == StatusTarefa.CONCLUIDO) {
                tarefa.setConcluidoEm(LocalDateTime.now(clock));
            } else if (anterior == StatusTarefa.CONCLUIDO) {
                tarefa.setConcluidoEm(null);
            }
            registrarHistorico(tarefa, usuario, "STATUS",
                    "Status alterado de " + labelStatus(anterior) + " para " + labelStatus(dto.getStatus()));
        }
        if (staffAccessService.podeGerenciarEquipeTarefas(usuario)
                && dto.getResponsavelId() != null
                && !dto.getResponsavelId().equals(tarefa.getResponsavelId())) {
            Usuario novoResponsavel = requireUsuarioAtivo(dto.getResponsavelId());
            registrarHistorico(tarefa, usuario, "RESPONSAVEL",
                    "Responsável alterado para " + novoResponsavel.getNome());
            tarefa.setResponsavel(novoResponsavel);
        }

        tarefa = tarefaRepository.save(tarefa);
        return tarefaMapper.toDto(tarefaRepository.findByIdDetalhado(tarefa.getId()).orElse(tarefa), true);
    }

    @Transactional
    public TarefaResponseDTO mover(UUID usuarioId, UUID tarefaId, MoverTarefaRequestDTO dto) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        StatusTarefa statusAnterior = tarefa.getStatus();
        StatusTarefa novoStatus = dto.getStatus();
        int novaOrdem = Math.max(0, dto.getOrdemKanban());

        UUID escopoResponsavel = staffAccessService.podeGerenciarEquipeTarefas(usuario)
                ? null
                : usuario.getUsuarioId();

        List<Tarefa> colunaDestino = escopoResponsavel == null
                ? tarefaRepository.findByStatusOrderByOrdemKanbanAsc(novoStatus)
                : tarefaRepository.findByResponsavel_UsuarioIdAndStatusOrderByOrdemKanbanAsc(escopoResponsavel, novoStatus);

        colunaDestino.removeIf(t -> t.getId().equals(tarefaId));
        if (novaOrdem > colunaDestino.size()) {
            novaOrdem = colunaDestino.size();
        }
        colunaDestino.add(novaOrdem, tarefa);

        if (statusAnterior != novoStatus) {
            tarefa.setStatus(novoStatus);
            if (novoStatus == StatusTarefa.CONCLUIDO) {
                tarefa.setConcluidoEm(LocalDateTime.now(clock));
            } else if (statusAnterior == StatusTarefa.CONCLUIDO) {
                tarefa.setConcluidoEm(null);
            }
            registrarHistorico(tarefa, usuario, "STATUS",
                    "Status alterado de " + labelStatus(statusAnterior) + " para " + labelStatus(novoStatus));
        }

        for (int i = 0; i < colunaDestino.size(); i++) {
            colunaDestino.get(i).setOrdemKanban(i);
        }
        tarefaRepository.saveAll(colunaDestino);
        return tarefaMapper.toDto(tarefaRepository.findByIdDetalhado(tarefaId).orElse(tarefa), false);
    }

    @Transactional
    public void excluir(UUID usuarioId, UUID tarefaId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        Tarefa tarefa = carregarComAcesso(usuario, tarefaId);
        tarefaRepository.delete(tarefa);
    }

    @Transactional(readOnly = true)
    public List<TarefaResponsavelOptionDTO> listarResponsaveis(UUID usuarioId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        if (!staffAccessService.podeGerenciarEquipeTarefas(usuario)) {
            return List.of(TarefaResponsavelOptionDTO.builder()
                    .usuarioId(usuario.getUsuarioId())
                    .nome(usuario.getNome())
                    .perfil(usuario.getPerfil())
                    .build());
        }
        return usuarioRepository.findByStatusUsuarioOrderByNomeAsc(StatusUsuario.ATIVO).stream()
                .map(u -> TarefaResponsavelOptionDTO.builder()
                        .usuarioId(u.getUsuarioId())
                        .nome(u.getNome())
                        .perfil(u.getPerfil())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> listarCategorias(UUID usuarioId) {
        staffAccessService.assertPodeAcessarTarefas(usuarioId);
        return tarefaRepository.findAll().stream()
                .map(Tarefa::getCategoria)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    private UUID resolverFiltroResponsavel(Usuario usuario, UUID responsavelIdFiltro, boolean visaoEquipe) {
        if (!staffAccessService.podeGerenciarEquipeTarefas(usuario)) {
            return usuario.getUsuarioId();
        }
        if (!visaoEquipe) {
            return usuario.getUsuarioId();
        }
        return responsavelIdFiltro;
    }

    private Usuario resolverResponsavelCriacao(Usuario solicitante, UUID responsavelId) {
        if (!staffAccessService.podeGerenciarEquipeTarefas(solicitante)) {
            return solicitante;
        }
        if (responsavelId == null) {
            return solicitante;
        }
        return requireUsuarioAtivo(responsavelId);
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

    private Usuario requireUsuarioAtivo(UUID id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        if (u.getStatusUsuario() != StatusUsuario.ATIVO) {
            throw new BusinessRuleException("Usuário responsável precisa estar ativo.");
        }
        return u;
    }

    private int nextOrdem(StatusTarefa status, UUID responsavelId) {
        Integer max = responsavelId == null
                ? tarefaRepository.maxOrdemKanbanPorStatus(status)
                : tarefaRepository.maxOrdemKanbanPorStatusEResponsavel(status, responsavelId);
        return max == null ? 0 : max + 1;
    }

    private void registrarHistorico(Tarefa tarefa, Usuario usuario, String acao, String descricao) {
        historicoRepository.save(TarefaHistorico.builder()
                .tarefa(tarefa)
                .usuario(usuario)
                .acao(acao)
                .descricao(descricao)
                .build());
    }

    private static String labelStatus(StatusTarefa status) {
        return switch (status) {
            case BACKLOG -> "Backlog";
            case A_FAZER -> "A Fazer";
            case EM_ANDAMENTO -> "Em andamento";
            case EM_REVISAO -> "Em revisão";
            case CONCLUIDO -> "Concluído";
        };
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
