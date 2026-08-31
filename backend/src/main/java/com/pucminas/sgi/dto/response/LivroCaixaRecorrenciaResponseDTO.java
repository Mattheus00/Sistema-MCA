package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivroCaixaRecorrenciaResponseDTO {

    private UUID id;
    private String descricao;
    private LivroCaixaTipoMovimentacao tipo;
    private BigDecimal valor;
    private UUID categoriaId;
    private String categoriaNome;
    private UUID contaId;
    private UUID clienteId;
    private String fornecedor;
    private FormaPagamentoLivroCaixa formaPagamento;
    private LivroCaixaRecorrenciaTipo recorrencia;
    private Integer intervaloDias;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private LocalDate proximaGeracao;
    private boolean ativo;
    private String observacao;
    private String criadoPor;
    private LocalDateTime criadoEm;
}
