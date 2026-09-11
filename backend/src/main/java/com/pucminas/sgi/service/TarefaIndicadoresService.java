package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.TarefaIndicadoresDTO;
import com.pucminas.sgi.dto.response.TarefaResumoColaboradorDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;
import com.pucminas.sgi.repository.TarefaRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TarefaIndicadoresService {

    static final List<StatusTarefa> STATUS_ABERTOS = List.of(
            StatusTarefa.BACKLOG,
            StatusTarefa.A_FAZER,
            StatusTarefa.EM_ANDAMENTO,
            StatusTarefa.EM_REVISAO
    );

    private final TarefaRepository tarefaRepository;
    private final UsuarioRepository usuarioRepository;
    private final StaffAccessService staffAccessService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public TarefaIndicadoresDTO indicadores(UUID usuarioId, UUID responsavelIdFiltro, boolean visaoEquipe) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        UUID responsavelEfetivo = resolverFiltroResponsavel(usuario, responsavelIdFiltro, visaoEquipe);
        LocalDate hoje = LocalDate.now(clock);
        LocalDateTime inicioSemana = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
        LocalDateTime fimSemana = hoje.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)).atTime(LocalTime.MAX);

        long emAberto;
        long emAndamento;
        long atrasadas;
        long concluidasNaSemana;
        if (responsavelEfetivo != null) {
            emAberto = tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(responsavelEfetivo, STATUS_ABERTOS);
            emAndamento = tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(
                    responsavelEfetivo, List.of(StatusTarefa.EM_ANDAMENTO));
            atrasadas = tarefaRepository.countByResponsavel_UsuarioIdAndStatusInAndDataVencimentoBefore(
                    responsavelEfetivo, STATUS_ABERTOS, hoje);
            concluidasNaSemana = tarefaRepository.countByResponsavel_UsuarioIdAndStatusAndConcluidoEmBetween(
                    responsavelEfetivo, StatusTarefa.CONCLUIDO, inicioSemana, fimSemana);
        } else {
            emAberto = tarefaRepository.countByStatusIn(STATUS_ABERTOS);
            emAndamento = tarefaRepository.countByStatusIn(List.of(StatusTarefa.EM_ANDAMENTO));
            atrasadas = tarefaRepository.countByStatusInAndDataVencimentoBefore(STATUS_ABERTOS, hoje);
            concluidasNaSemana = tarefaRepository.countByStatusAndConcluidoEmBetween(
                    StatusTarefa.CONCLUIDO, inicioSemana, fimSemana);
        }
        return TarefaIndicadoresDTO.builder()
                .emAberto(emAberto)
                .emAndamento(emAndamento)
                .atrasadas(atrasadas)
                .concluidasNaSemana(concluidasNaSemana)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TarefaResumoColaboradorDTO> resumoColaboradores(UUID usuarioId) {
        Usuario usuario = staffAccessService.assertPodeAcessarTarefas(usuarioId);
        if (!staffAccessService.podeGerenciarEquipeTarefas(usuario)) {
            throw new AccessDeniedBusinessException("Sem permissão para visualizar resumo da equipe.");
        }
        LocalDate hoje = LocalDate.now(clock);
        return usuarioRepository.findByStatusUsuarioOrderByNomeAsc(StatusUsuario.ATIVO).stream()
                .map(u -> {
                    long total = tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(u.getUsuarioId(),
                            List.of(StatusTarefa.BACKLOG, StatusTarefa.A_FAZER, StatusTarefa.EM_ANDAMENTO,
                                    StatusTarefa.EM_REVISAO, StatusTarefa.CONCLUIDO));
                    long atrasadas = tarefaRepository.countByResponsavel_UsuarioIdAndStatusInAndDataVencimentoBefore(
                            u.getUsuarioId(), STATUS_ABERTOS, hoje);
                    long emAndamento = tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(
                            u.getUsuarioId(), List.of(StatusTarefa.EM_ANDAMENTO));
                    long concluidas = tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(
                            u.getUsuarioId(), List.of(StatusTarefa.CONCLUIDO));
                    return TarefaResumoColaboradorDTO.builder()
                            .usuarioId(u.getUsuarioId())
                            .nome(u.getNome())
                            .totalTarefas(total)
                            .atrasadas(atrasadas)
                            .emAndamento(emAndamento)
                            .concluidas(concluidas)
                            .build();
                })
                .filter(r -> r.getTotalTarefas() > 0)
                .collect(Collectors.toList());
    }

    UUID resolverFiltroResponsavel(Usuario usuario, UUID responsavelIdFiltro, boolean visaoEquipe) {
        if (!staffAccessService.podeGerenciarEquipeTarefas(usuario)) {
            return usuario.getUsuarioId();
        }
        if (!visaoEquipe) {
            return usuario.getUsuarioId();
        }
        return responsavelIdFiltro;
    }
}
