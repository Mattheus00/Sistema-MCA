package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtualizarClienteBoletoRequest {

    @NotNull(message = "ID do cliente é obrigatório")
    private UUID clienteId;
}
