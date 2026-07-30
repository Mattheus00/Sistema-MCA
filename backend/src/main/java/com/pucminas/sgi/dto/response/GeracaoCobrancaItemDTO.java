package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.TipoCobranca;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeracaoCobrancaItemDTO {
    private UUID clienteId;
    private String clienteNome;
    private TipoCobranca tipoCobranca;
    private String competencia;
    private UUID dividaId;
    private String status;
    private String mensagem;
}
