package com.pucminas.sgi.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body do PATCH /api/inadimplentes/:id - confirmar pagamento.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InadimplenciaStatusDTO {
    private String status; // "Pago"
}
