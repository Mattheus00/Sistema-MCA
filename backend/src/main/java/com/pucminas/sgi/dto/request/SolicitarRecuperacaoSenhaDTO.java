package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SolicitarRecuperacaoSenhaDTO {
    @NotBlank(message = "Login é obrigatório")
    @Size(max = 100)
    private String login;
}
