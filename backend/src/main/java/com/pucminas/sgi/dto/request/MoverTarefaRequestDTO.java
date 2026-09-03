package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.StatusTarefa;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoverTarefaRequestDTO {

    @NotNull
    private StatusTarefa status;

    /** Nova posição (0-based) na coluna de destino. */
    @NotNull
    private Integer ordemKanban;
}
