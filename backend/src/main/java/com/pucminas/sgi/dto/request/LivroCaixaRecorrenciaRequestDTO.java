package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaRecorrenciaTipo;
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
public class LivroCaixaRecorrenciaRequestDTO {

    @NotBlank
    @Size(max = 300)
    private String descricao;

    @NotNull
    private LivroCaixaTipoMovimentacao tipo;

    @NotNull
    @Positive
    private BigDecimal valor;

    @NotNull
    private UUID categoriaId;

    private UUID contaId;
    private UUID clienteId;

    @Size(max = 200)
    private String fornecedor;

    private FormaPagamentoLivroCaixa formaPagamento;

    @NotNull
    private LivroCaixaRecorrenciaTipo recorrencia;

    private Integer intervaloDias;

    @NotNull
    private LocalDate dataInicio;

    private LocalDate dataFim;

    @Size(max = 2000)
    private String observacao;
}
