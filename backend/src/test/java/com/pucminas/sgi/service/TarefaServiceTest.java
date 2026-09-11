package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.TarefaRequestDTO;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.TarefaChecklistRepository;
import com.pucminas.sgi.repository.TarefaHistoricoRepository;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TarefaServiceTest {

    @Mock TarefaRepository tarefaRepository;
    @Mock TarefaChecklistRepository checklistRepository;
    @Mock TarefaHistoricoRepository historicoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock StaffAccessService staffAccessService;

    @InjectMocks TarefaService tarefaService;

    @Test
    void gestorSemResponsavelAssumeOProprioSolicitante() {
        Usuario gestora = usuario(UUID.randomUUID(), Perfil.PROPRIETARIA);
        when(staffAccessService.assertPodeAcessarTarefas(gestora.getUsuarioId())).thenReturn(gestora);
        when(staffAccessService.podeGerenciarEquipeTarefas(gestora)).thenReturn(true);
        stubPersistencia();

        var dto = TarefaRequestDTO.builder().titulo("Minha tarefa").responsavelId(null).build();
        var resposta = tarefaService.criar(gestora.getUsuarioId(), dto);

        assertThat(resposta.getResponsavelId()).isEqualTo(gestora.getUsuarioId());
        verifyNoInteractions(usuarioRepository);
    }

    @Test
    void gestorComResponsavelValidaUsuarioAtivo() {
        Usuario gestora = usuario(UUID.randomUUID(), Perfil.PROPRIETARIA);
        Usuario colaborador = usuario(UUID.randomUUID(), Perfil.FUNCIONARIO);
        when(staffAccessService.assertPodeAcessarTarefas(gestora.getUsuarioId())).thenReturn(gestora);
        when(staffAccessService.podeGerenciarEquipeTarefas(gestora)).thenReturn(true);
        when(usuarioRepository.findById(colaborador.getUsuarioId())).thenReturn(Optional.of(colaborador));
        stubPersistencia();

        var dto = TarefaRequestDTO.builder().titulo("Delegada").responsavelId(colaborador.getUsuarioId()).build();
        var resposta = tarefaService.criar(gestora.getUsuarioId(), dto);

        assertThat(resposta.getResponsavelId()).isEqualTo(colaborador.getUsuarioId());
        verify(usuarioRepository).findById(colaborador.getUsuarioId());
    }

    private void stubPersistencia() {
        when(tarefaRepository.save(any(Tarefa.class))).thenAnswer(inv -> {
            Tarefa t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId(UUID.randomUUID());
            }
            return t;
        });
        when(tarefaRepository.findByIdDetalhado(any())).thenAnswer(inv -> Optional.empty());
        when(checklistRepository.findByTarefaIdOrderByOrdemAsc(any())).thenReturn(List.of());
        when(historicoRepository.findByTarefaIdOrderByCriadoEmDesc(any())).thenReturn(List.of());
    }

    private static Usuario usuario(UUID id, Perfil perfil) {
        return Usuario.builder()
                .usuarioId(id)
                .telefone("31999999999")
                .senha("hash")
                .nome("Nome")
                .perfil(perfil)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
    }
}
