package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarRespostaDocumentoRequestDTO {

    @NotBlank(message = "Resposta é obrigatória")
    @Size(max = 2000, message = "Resposta deve ter no máximo 2000 caracteres")
    private String resposta;
}
