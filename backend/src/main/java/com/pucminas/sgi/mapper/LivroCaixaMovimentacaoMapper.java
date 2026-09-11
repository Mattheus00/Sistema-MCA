package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.LivroCaixaMovimentacaoResponseDTO;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.service.LivroCaixaSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class LivroCaixaMovimentacaoMapper {

    private final Clock clock;

    public LivroCaixaMovimentacaoResponseDTO toDto(LivroCaixaMovimentacao mov) {
        LocalDate hoje = LocalDate.now(clock);
        return LivroCaixaMovimentacaoResponseDTO.builder()
                .id(mov.getId())
                .tipo(mov.getTipo())
                .descricao(mov.getDescricao())
                .valor(LivroCaixaSupport.centavosParaReais(mov.getValorCentavos()))
                .categoriaId(mov.getCategoriaId())
                .categoriaNome(mov.getCategoria() != null ? mov.getCategoria().getNome() : null)
                .clienteId(mov.getClienteId())
                .clienteNome(mov.getCliente() != null ? mov.getCliente().getNome() : null)
                .dataMovimentacao(mov.getDataMovimentacao())
                .dataVencimento(mov.getDataVencimento())
                .dataPagamento(mov.getDataPagamento())
                .status(mov.getStatus())
                .formaPagamento(mov.getFormaPagamento())
                .contaId(mov.getContaId())
                .contaNome(mov.getConta() != null ? mov.getConta().getNome() : null)
                .observacao(mov.getObservacao())
                .fornecedor(mov.getFornecedor())
                .origem(mov.getOrigem())
                .origemId(mov.getOrigemId())
                .editavel(LivroCaixaSupport.isEditavel(mov))
                .vencido(LivroCaixaSupport.isVencido(mov, hoje))
                .proximoVencimento(LivroCaixaSupport.isProximoVencimento(mov, hoje))
                .criadoPor(mov.getCriadoPor())
                .atualizadoPor(mov.getAtualizadoPor())
                .criadoEm(mov.getCriadoEm())
                .atualizadoEm(mov.getAtualizadoEm())
                .canceladoEm(mov.getCanceladoEm())
                .build();
    }
}
