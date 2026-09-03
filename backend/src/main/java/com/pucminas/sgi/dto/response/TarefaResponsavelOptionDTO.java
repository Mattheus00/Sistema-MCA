package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.Perfil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaResponsavelOptionDTO {

    private UUID usuarioId;
    private String nome;
    private Perfil perfil;
}
