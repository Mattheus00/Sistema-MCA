package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.StatusDocumentoCliente;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AtualizarStatusDocumentoRequestDTO {

    @NotNull(message = "Status é obrigatório")
    private StatusDocumentoCliente status;
}
