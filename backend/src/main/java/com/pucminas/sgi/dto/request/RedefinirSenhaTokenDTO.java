package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RedefinirSenhaTokenDTO {
    @NotBlank(message = "Token é obrigatório")
    @Size(max = 128)
    private String token;
    @NotBlank(message = "Nova senha é obrigatória")
    @Size(min = 4, max = 255, message = "Nova senha deve ter entre 4 e 255 caracteres")
    private String novaSenha;
    @NotBlank(message = "Confirmação de senha é obrigatória")
    @Size(min = 4, max = 255, message = "Confirmação de senha deve ter entre 4 e 255 caracteres")
    private String confirmarSenha;
}
