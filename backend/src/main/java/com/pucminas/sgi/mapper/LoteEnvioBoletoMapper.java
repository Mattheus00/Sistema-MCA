package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.HistoricoLoteResponse;
import com.pucminas.sgi.dto.response.ItemEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.LoteEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.ResumoLoteEnvioResponse;
import com.pucminas.sgi.dto.response.ResultadoEnvioItemResponse;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.util.DocumentoUtil;
import com.pucminas.sgi.util.EnvioBoletoUtil;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class LoteEnvioBoletoMapper {

    public LoteEnvioBoletoResponse toLoteResponse(LoteEnvioBoleto lote, List<String> bloqueiosPorItem) {
        List<ItemEnvioBoletoResponse> itens = new ArrayList<>();
        int idx = 0;
        for (EnvioBoleto item : lote.getItens()) {
            List<String> bloqueios = bloqueiosPorItem != null && idx < bloqueiosPorItem.size()
                    ? parseBloqueios(bloqueiosPorItem.get(idx))
                    : List.of();
            itens.add(toItemResponse(item, bloqueios));
            idx++;
        }
        return LoteEnvioBoletoResponse.builder()
                .loteId(lote.getLoteId())
                .status(lote.getStatus())
                .usuarioResponsavelId(lote.getUsuarioResponsavel().getUsuarioId())
                .usuarioResponsavelNome(lote.getUsuarioResponsavel().getNome())
                .quantidadeTotal(lote.getQuantidadeTotal())
                .quantidadeIdentificada(lote.getQuantidadeIdentificada())
                .quantidadePendente(lote.getQuantidadePendente())
                .quantidadeEnviada(lote.getQuantidadeEnviada())
                .quantidadeComErro(lote.getQuantidadeComErro())
                .criadoEm(lote.getCriadoEm())
                .dataConfirmacao(lote.getDataConfirmacao())
                .dataFinalizacao(lote.getDataFinalizacao())
                .itens(itens)
                .resumo(calcularResumo(lote.getItens()))
                .build();
    }

    public ItemEnvioBoletoResponse toItemResponse(EnvioBoleto item, List<String> bloqueios) {
        Cliente cliente = item.getCliente();
        String emailDestinatario = EnvioBoletoUtil.resolverEmailDestinatario(item);
        String mensagem = bloqueios.isEmpty() ? null : String.join("; ", bloqueios);
        return ItemEnvioBoletoResponse.builder()
                .envioBoletoId(item.getEnvioBoletoId())
                .clienteId(cliente != null ? cliente.getClienteId() : null)
                .clienteNome(cliente != null ? cliente.getNome() : null)
                .documentoMascarado(cliente != null ? DocumentoUtil.mascararDocumento(cliente.getCpfCnpj()) : null)
                .nomeArquivoOriginal(item.getNomeArquivoOriginal())
                .emailDestinatario(emailDestinatario)
                .metodoIdentificacao(item.getMetodoIdentificacao())
                .confiancaIdentificacao(item.getConfiancaIdentificacao())
                .status(item.getStatus())
                .tamanhoArquivo(item.getTamanhoArquivo())
                .possivelDuplicidade(item.getPossivelDuplicidade())
                .confirmadoPeloUsuario(item.getConfirmadoPeloUsuario())
                .simulado(item.getSimulado())
                .reenvio(item.getReenvio())
                .mensagemErro(item.getMensagemErro())
                .mensagemValidacao(mensagem)
                .bloqueios(bloqueios)
                .dataEnvio(item.getDataEnvio())
                .criadoEm(item.getCriadoEm())
                .build();
    }

    public HistoricoLoteResponse toHistorico(LoteEnvioBoleto lote) {
        return HistoricoLoteResponse.builder()
                .loteId(lote.getLoteId())
                .status(lote.getStatus())
                .usuarioResponsavelNome(lote.getUsuarioResponsavel().getNome())
                .quantidadeTotal(lote.getQuantidadeTotal())
                .quantidadeEnviada(lote.getQuantidadeEnviada())
                .quantidadeComErro(lote.getQuantidadeComErro())
                .criadoEm(lote.getCriadoEm())
                .dataFinalizacao(lote.getDataFinalizacao())
                .build();
    }

    public ResultadoEnvioItemResponse toResultado(EnvioBoleto item) {
        Cliente cliente = item.getCliente();
        return ResultadoEnvioItemResponse.builder()
                .envioBoletoId(item.getEnvioBoletoId())
                .clienteId(cliente != null ? cliente.getClienteId() : null)
                .clienteNome(cliente != null ? cliente.getNome() : null)
                .emailDestinatario(EnvioBoletoUtil.resolverEmailDestinatario(item))
                .nomeArquivoOriginal(item.getNomeArquivoOriginal())
                .status(item.getStatus())
                .simulado(item.getSimulado())
                .reenvio(item.getReenvio())
                .mensagemErro(item.getMensagemErro())
                .dataEnvio(item.getDataEnvio())
                .build();
    }

    public ResumoLoteEnvioResponse calcularResumo(List<EnvioBoleto> itens) {
        int total = itens.size();
        int identificados = 0;
        int aguardando = 0;
        int semEmail = 0;
        int duplicados = 0;
        int prontos = 0;
        int ignorados = 0;
        int enviados = 0;
        int erros = 0;
        int bloqueados = 0;
        for (EnvioBoleto item : itens) {
            if (item.getCliente() != null) {
                identificados++;
            }
            if (item.getStatus() == StatusEnvioBoleto.AGUARDANDO_CORRECAO) {
                aguardando++;
            }
            if (EnvioBoletoUtil.resolverEmailDestinatario(item) == null) {
                semEmail++;
            }
            if (Boolean.TRUE.equals(item.getPossivelDuplicidade())) {
                duplicados++;
            }
            if (item.getStatus() == StatusEnvioBoleto.PRONTO_PARA_ENVIO) {
                prontos++;
            }
            if (item.getStatus() == StatusEnvioBoleto.IGNORADO) {
                ignorados++;
            }
            if (item.getStatus() == StatusEnvioBoleto.ENVIADO) {
                enviados++;
            }
            if (item.getStatus() == StatusEnvioBoleto.ERRO) {
                erros++;
            }
            if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.BAIXA
                    && !Boolean.TRUE.equals(item.getConfirmadoPeloUsuario())
                    && item.getStatus() != StatusEnvioBoleto.IGNORADO) {
                bloqueados++;
            }
            if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO
                    && item.getStatus() != StatusEnvioBoleto.IGNORADO) {
                bloqueados++;
            }
        }
        return ResumoLoteEnvioResponse.builder()
                .total(total)
                .identificados(identificados)
                .aguardandoCorrecao(aguardando)
                .semEmail(semEmail)
                .duplicados(duplicados)
                .prontosParaEnvio(prontos)
                .ignorados(ignorados)
                .enviados(enviados)
                .erros(erros)
                .bloqueados(bloqueados)
                .build();
    }

    private List<String> parseBloqueios(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return List.of(joined.split("\\|"));
    }
}
