package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortalMeResponseDTO {
    private UUID clienteId;
    private String codigo;
    private String nome;
    private String cpfCnpjMascarado;
    private String email;
    private String celular;
    private BigDecimal saldoDevedorTotal;
}
