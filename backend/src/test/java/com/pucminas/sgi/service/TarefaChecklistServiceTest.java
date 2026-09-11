package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.TarefaChecklistItemRequestDTO;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.TarefaChecklistItem;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.TarefaMapper;
import com.pucminas.sgi.repository.TarefaChecklistRepository;
import com.pucminas.sgi.repository.TarefaHistoricoRepository;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TarefaChecklistServiceTest {

    @Mock TarefaRepository tarefaRepository;
    @Mock TarefaChecklistRepository checklistRepository;
    @Mock TarefaHistoricoRepository historicoRepository;
    @Mock StaffAccessService staffAccessService;

    private TarefaChecklistService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC);
        service = new TarefaChecklistService(
                tarefaRepository, checklistRepository, historicoRepository, staffAccessService,
                new TarefaMapper(checklistRepository, historicoRepository, clock));
    }

    @Test
    void adicionaItemERegistraHistorico() {
        Usuario user = usuario();
        Tarefa tarefa = Tarefa.builder().id(UUID.randomUUID()).responsavel(user).responsavelId(user.getUsuarioId()).titulo("T").build();
        when(staffAccessService.assertPodeAcessarTarefas(user.getUsuarioId())).thenReturn(user);
        when(tarefaRepository.findByIdDetalhado(tarefa.getId())).thenReturn(Optional.of(tarefa));
        when(staffAccessService.podeGerenciarEquipeTarefas(user)).thenReturn(true);
        when(checklistRepository.countByTarefaId(tarefa.getId())).thenReturn(0L);
        when(checklistRepository.save(any())).thenAnswer(inv -> {
            TarefaChecklistItem item = inv.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });

        var dto = service.adicionar(user.getUsuarioId(), tarefa.getId(),
                TarefaChecklistItemRequestDTO.builder().descricao("  item  ").build());

        assertThat(dto.getDescricao()).isEqualTo("item");
        verify(historicoRepository).save(any());
    }

    @Test
    void alternarItemInexistenteLanca404() {
        Usuario user = usuario();
        Tarefa tarefa = Tarefa.builder().id(UUID.randomUUID()).responsavel(user).responsavelId(user.getUsuarioId()).titulo("T").build();
        UUID itemId = UUID.randomUUID();
        when(staffAccessService.assertPodeAcessarTarefas(user.getUsuarioId())).thenReturn(user);
        when(tarefaRepository.findByIdDetalhado(tarefa.getId())).thenReturn(Optional.of(tarefa));
        when(staffAccessService.podeGerenciarEquipeTarefas(user)).thenReturn(true);
        when(checklistRepository.findById(itemId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.alternar(user.getUsuarioId(), tarefa.getId(), itemId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static Usuario usuario() {
        return Usuario.builder()
                .usuarioId(UUID.randomUUID())
                .telefone("1")
                .senha("x")
                .nome("Ana")
                .perfil(Perfil.FUNCIONARIO)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
    }
}
