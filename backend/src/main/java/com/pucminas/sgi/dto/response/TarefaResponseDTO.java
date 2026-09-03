package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaResponseDTO {

    private UUID id;
    private String titulo;
    private String descricao;
    private StatusTarefa status;
    private PrioridadeTarefa prioridade;
    private UUID responsavelId;
    private String responsavelNome;
    private UUID criadoPorId;
    private String criadoPorNome;
    private LocalDate dataInicio;
    private LocalDate dataVencimento;
    private String categoria;
    private int ordemKanban;
    private String observacoes;
    private LocalDateTime concluidoEm;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
    private boolean atrasada;
    private int checklistTotal;
    private int checklistConcluidos;
    private List<TarefaChecklistItemResponseDTO> checklist;
    private List<TarefaHistoricoResponseDTO> historico;
}
