package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusTarefa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaRequestDTO {

    @NotBlank
    @Size(max = 300)
    private String titulo;

    @Size(max = 4000)
    private String descricao;

    /** Obrigatório para gestores; ignorado para FUNCIONARIO (força o próprio usuário). */
    private UUID responsavelId;

    private StatusTarefa status;

    private PrioridadeTarefa prioridade;

    @Size(max = 120)
    private String categoria;

    private LocalDate dataInicio;

    private LocalDate dataVencimento;

    @Size(max = 2000)
    private String observacoes;

    private List<@Size(max = 500) String> checklistItens;
}
