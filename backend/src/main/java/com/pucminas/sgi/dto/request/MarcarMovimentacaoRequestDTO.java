package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarcarMovimentacaoRequestDTO {

    @NotNull
    private LocalDate dataPagamento;

    private FormaPagamentoLivroCaixa formaPagamento;

    private UUID contaId;
}
