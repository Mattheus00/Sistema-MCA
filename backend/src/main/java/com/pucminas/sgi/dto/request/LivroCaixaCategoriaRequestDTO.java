package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaCategoriaRequestDTO {

    @NotBlank
    @Size(max = 120)
    private String nome;

    @NotNull
    private LivroCaixaTipoMovimentacao tipo;
}
