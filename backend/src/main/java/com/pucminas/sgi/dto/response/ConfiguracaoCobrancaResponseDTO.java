package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracaoCobrancaResponseDTO {
    private UUID configuracaoId;
    private UUID clienteId;
    private String clienteNome;
    private Boolean cobrancaRecorrenteAtiva;
    private Integer diaVencimento;
    private Boolean taxaBalancoAtiva;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}
