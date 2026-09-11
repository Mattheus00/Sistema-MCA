package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.TarefaIndicadoresDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TarefaIndicadoresServiceTest {

    @Mock TarefaRepository tarefaRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock StaffAccessService staffAccessService;

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-10T15:00:00Z"), ZoneId.of("America/Sao_Paulo"));
    private TarefaIndicadoresService service;

    @BeforeEach
    void setUp() {
        service = new TarefaIndicadoresService(tarefaRepository, usuarioRepository, staffAccessService, clock);
    }

    @Test
    void indicadoresDoProprioUsuario() {
        Usuario user = usuario(UUID.randomUUID(), Perfil.FUNCIONARIO);
        when(staffAccessService.assertPodeAcessarTarefas(user.getUsuarioId())).thenReturn(user);
        when(staffAccessService.podeGerenciarEquipeTarefas(user)).thenReturn(false);
        when(tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(eq(user.getUsuarioId()), any())).thenReturn(3L, 1L);
        when(tarefaRepository.countByResponsavel_UsuarioIdAndStatusInAndDataVencimentoBefore(
                eq(user.getUsuarioId()), any(), eq(LocalDate.now(clock)))).thenReturn(1L);
        when(tarefaRepository.countByResponsavel_UsuarioIdAndStatusAndConcluidoEmBetween(
                eq(user.getUsuarioId()), eq(StatusTarefa.CONCLUIDO), any(), any())).thenReturn(2L);

        TarefaIndicadoresDTO dto = service.indicadores(user.getUsuarioId(), null, true);

        assertThat(dto.getEmAberto()).isEqualTo(3);
        assertThat(dto.getEmAndamento()).isEqualTo(1);
        assertThat(dto.getAtrasadas()).isEqualTo(1);
        assertThat(dto.getConcluidasNaSemana()).isEqualTo(2);
    }

    @Test
    void resumoColaboradoresExigeGestor() {
        Usuario user = usuario(UUID.randomUUID(), Perfil.FUNCIONARIO);
        when(staffAccessService.assertPodeAcessarTarefas(user.getUsuarioId())).thenReturn(user);
        when(staffAccessService.podeGerenciarEquipeTarefas(user)).thenReturn(false);

        assertThatThrownBy(() -> service.resumoColaboradores(user.getUsuarioId()))
                .isInstanceOf(AccessDeniedBusinessException.class);
    }

    @Test
    void resumoColaboradoresFiltraQuemNaoTemTarefa() {
        Usuario gestora = usuario(UUID.randomUUID(), Perfil.PROPRIETARIA);
        Usuario colaborador = usuario(UUID.randomUUID(), Perfil.FUNCIONARIO);
        when(staffAccessService.assertPodeAcessarTarefas(gestora.getUsuarioId())).thenReturn(gestora);
        when(staffAccessService.podeGerenciarEquipeTarefas(gestora)).thenReturn(true);
        when(usuarioRepository.findByStatusUsuarioOrderByNomeAsc(StatusUsuario.ATIVO)).thenReturn(List.of(colaborador));
        when(tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(eq(colaborador.getUsuarioId()), any()))
                .thenReturn(2L, 1L, 1L);
        when(tarefaRepository.countByResponsavel_UsuarioIdAndStatusInAndDataVencimentoBefore(
                eq(colaborador.getUsuarioId()), any(), any())).thenReturn(0L);

        var resumo = service.resumoColaboradores(gestora.getUsuarioId());

        assertThat(resumo).hasSize(1);
        assertThat(resumo.getFirst().getTotalTarefas()).isEqualTo(2);
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
