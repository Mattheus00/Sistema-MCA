package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.FormaPagamentoLivroCaixa;
import com.pucminas.sgi.enums.LivroCaixaOrigemMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
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
public class LivroCaixaMovimentacaoResponseDTO {

    private UUID id;
    private LivroCaixaTipoMovimentacao tipo;
    private String descricao;
    private BigDecimal valor;
    private UUID categoriaId;
    private String categoriaNome;
    private UUID clienteId;
    private String clienteNome;
    private LocalDate dataMovimentacao;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private LivroCaixaStatusMovimentacao status;
    private FormaPagamentoLivroCaixa formaPagamento;
    private UUID contaId;
    private String contaNome;
    private String observacao;
    private String fornecedor;
    private LivroCaixaOrigemMovimentacao origem;
    private UUID origemId;
    private boolean editavel;
    private boolean vencido;
    private boolean proximoVencimento;
    private String criadoPor;
    private String atualizadoPor;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
    private LocalDateTime canceladoEm;
}
