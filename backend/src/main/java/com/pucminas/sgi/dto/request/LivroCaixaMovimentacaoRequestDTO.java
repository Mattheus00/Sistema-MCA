package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaMovimentacaoRequestDTO {

    @NotNull
    private LivroCaixaTipoMovimentacao tipo;

    @NotBlank
    @Size(max = 300)
    private String descricao;

    /** Valor em reais. */
    @NotNull
    @Positive
    private BigDecimal valor;

    @NotNull
    private UUID categoriaId;

    private UUID clienteId;

    @NotNull
    private LocalDate dataMovimentacao;

    private LocalDate dataVencimento;

    private LocalDate dataPagamento;

    @NotNull
    private LivroCaixaStatusMovimentacao status;

    private FormaPagamentoLivroCaixa formaPagamento;

    private UUID contaId;

    @Size(max = 2000)
    private String observacao;

    @Size(max = 200)
    private String fornecedor;
}
