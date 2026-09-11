package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.ItemEnvioBoletoResponse;
import com.pucminas.sgi.dto.response.ValidacaoLoteResponse;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import com.pucminas.sgi.util.EnvioBoletoUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class LoteEnvioBoletoValidacaoService {

    private final LoteEnvioBoletoRepository loteRepository;
    private final EnvioBoletoRepository envioBoletoRepository;
    private final LoteEnvioBoletoMapper mapper;

    public ValidacaoLoteResponse validar(LoteEnvioBoleto lote) {
        atualizarStatusItensDoLote(lote);
        List<String> bloqueiosItens = montarBloqueiosItens(lote.getItens());
        List<String> bloqueiosGerais = new ArrayList<>();
        boolean podeEnviar = bloqueiosItens.stream().allMatch(b -> b == null || b.isBlank());
        if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
            bloqueiosGerais.add("Lote em processamento.");
            podeEnviar = false;
        }
        if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
            bloqueiosGerais.add("Lote cancelado.");
            podeEnviar = false;
        }
        List<ItemEnvioBoletoResponse> itensResp = new ArrayList<>();
        for (int i = 0; i < lote.getItens().size(); i++) {
            itensResp.add(mapper.toItemResponse(lote.getItens().get(i), parseBloqueios(bloqueiosItens.get(i))));
        }
        return ValidacaoLoteResponse.builder()
                .loteId(lote.getLoteId())
                .podeEnviar(podeEnviar)
                .resumo(mapper.calcularResumo(lote.getItens()))
                .itens(itensResp)
                .bloqueiosGerais(bloqueiosGerais)
                .build();
    }

    public void assertLoteEditavel(LoteEnvioBoleto lote) {
        if (lote.getStatus() == StatusLoteEnvioBoleto.PROCESSANDO) {
            throw new BusinessRuleException("Lote em processamento.");
        }
        if (lote.getStatus() == StatusLoteEnvioBoleto.CANCELADO) {
            throw new BusinessRuleException("Lote cancelado.");
        }
    }

    public void aplicarIdentificacao(EnvioBoleto item, Cliente cliente) {
        if (cliente == null) {
            item.setCliente(null);
            item.setEmailDestinatario(null);
            return;
        }
        item.setCliente(cliente);
        item.setEmailDestinatario(TelefoneClienteUtil.normalizarEmailOpcional(cliente.getEmail()));
    }

    public void atualizarDuplicidade(EnvioBoleto item) {
        if (item.getCliente() == null) {
            item.setPossivelDuplicidade(false);
            return;
        }
        boolean dup;
        if (item.getEnvioBoletoId() == null) {
            dup = envioBoletoRepository.existsByHashArquivoAndCliente_ClienteIdAndStatus(
                    item.getHashArquivo(),
                    item.getCliente().getClienteId(),
                    StatusEnvioBoleto.ENVIADO);
        } else {
            dup = envioBoletoRepository.existsByHashArquivoAndCliente_ClienteIdAndStatusAndEnvioBoletoIdNot(
                    item.getHashArquivo(),
                    item.getCliente().getClienteId(),
                    StatusEnvioBoleto.ENVIADO,
                    item.getEnvioBoletoId());
        }
        item.setPossivelDuplicidade(dup);
    }

    public void recalcularStatusItem(EnvioBoleto item) {
        if (item.getStatus() == StatusEnvioBoleto.IGNORADO
                || item.getStatus() == StatusEnvioBoleto.ENVIADO
                || item.getStatus() == StatusEnvioBoleto.CANCELADO) {
            return;
        }
        EnvioBoletoUtil.sincronizarEmailDoCliente(item);
        if (item.getCliente() == null
                || item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.BAIXA
                && !Boolean.TRUE.equals(item.getConfirmadoPeloUsuario())) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (EnvioBoletoUtil.resolverEmailDestinatario(item) == null) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        if (item.getCliente().getStatusCliente() == StatusCliente.INATIVO) {
            item.setStatus(StatusEnvioBoleto.AGUARDANDO_CORRECAO);
            return;
        }
        item.setStatus(StatusEnvioBoleto.PRONTO_PARA_ENVIO);
    }

    public void recalcularContadoresLote(LoteEnvioBoleto lote) {
        List<EnvioBoleto> itens = lote.getItens();
        lote.setQuantidadeTotal(itens.size());
        lote.setQuantidadeIdentificada((int) itens.stream().filter(i -> i.getCliente() != null).count());
        lote.setQuantidadePendente((int) itens.stream()
                .filter(i -> i.getStatus() == StatusEnvioBoleto.AGUARDANDO_CORRECAO
                        || i.getStatus() == StatusEnvioBoleto.PENDENTE_ANALISE)
                .count());
        lote.setQuantidadeEnviada((int) itens.stream().filter(i -> i.getStatus() == StatusEnvioBoleto.ENVIADO).count());
        lote.setQuantidadeComErro((int) itens.stream().filter(i -> i.getStatus() == StatusEnvioBoleto.ERRO).count());
    }

    public List<String> montarBloqueiosItens(List<EnvioBoleto> itens) {
        List<String> result = new ArrayList<>();
        for (EnvioBoleto item : itens) {
            result.add(String.join("|", calcularBloqueiosItem(item, false)));
        }
        return result;
    }

    public List<String> calcularBloqueiosItem(EnvioBoleto item, boolean permitirDuplicado) {
        if (item.getStatus() == StatusEnvioBoleto.IGNORADO) {
            return List.of();
        }
        List<String> bloqueios = new ArrayList<>();
        if (item.getCliente() == null) {
            bloqueios.add("Cliente não identificado.");
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO) {
            bloqueios.add("Confiança não identificada — corrija manualmente.");
        }
        if (item.getConfiancaIdentificacao() == ConfiancaIdentificacaoBoleto.BAIXA
                && !Boolean.TRUE.equals(item.getConfirmadoPeloUsuario())) {
            bloqueios.add("Confiança baixa — confirme ou corrija o cliente.");
        }
        if (EnvioBoletoUtil.resolverEmailDestinatario(item) == null) {
            bloqueios.add("Cliente sem e-mail válido.");
        }
        if (item.getCliente() != null && item.getCliente().getStatusCliente() == StatusCliente.INATIVO) {
            bloqueios.add("Cliente inativo.");
        }
        if (Boolean.TRUE.equals(item.getPossivelDuplicidade()) && !permitirDuplicado) {
            bloqueios.add("Possível duplicidade — boleto já enviado para este cliente.");
        }
        if (item.getStatus() != StatusEnvioBoleto.PRONTO_PARA_ENVIO && item.getStatus() != StatusEnvioBoleto.ERRO) {
            bloqueios.add("Item não está pronto para envio.");
        }
        return bloqueios;
    }

    public void atualizarStatusItensDoLote(LoteEnvioBoleto lote) {
        boolean alterado = false;
        for (EnvioBoleto item : lote.getItens()) {
            if (item.getStatus() == StatusEnvioBoleto.IGNORADO
                    || item.getStatus() == StatusEnvioBoleto.ENVIADO
                    || item.getStatus() == StatusEnvioBoleto.CANCELADO
                    || item.getStatus() == StatusEnvioBoleto.ENVIANDO) {
                continue;
            }
            StatusEnvioBoleto antes = item.getStatus();
            String emailAntes = item.getEmailDestinatario();
            EnvioBoletoUtil.sincronizarEmailDoCliente(item);
            recalcularStatusItem(item);
            if (item.getStatus() != antes || !Objects.equals(emailAntes, item.getEmailDestinatario())) {
                envioBoletoRepository.save(item);
                alterado = true;
            }
        }
        if (alterado) {
            recalcularContadoresLote(lote);
            loteRepository.save(lote);
        }
    }

    /**
     * Se o frontend enviar IDs inválidos (ex.: clienteId ou índice), ignora a seleção
     * e permite enviar todos os itens prontos do lote.
     */
    public List<UUID> filtrarItemIdsExistentesNoLote(LoteEnvioBoleto lote, List<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return itemIds;
        }
        List<UUID> idsDoLote = lote.getItens().stream().map(EnvioBoleto::getEnvioBoletoId).toList();
        List<UUID> validos = itemIds.stream().filter(idsDoLote::contains).toList();
        if (validos.isEmpty()) {
            log.warn("Nenhum itemId da requisição pertence ao lote {} — enviando todos os prontos.", lote.getLoteId());
            return null;
        }
        return validos;
    }

    public static List<UUID> normalizarItemIds(List<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return itemIds;
        }
        return itemIds.stream().filter(Objects::nonNull).distinct().toList();
    }

    public static List<EnvioBoleto> filtrarCandidatosEnvio(List<EnvioBoleto> itens, List<UUID> itemIds) {
        return itens.stream()
                .filter(i -> itemIds == null || itemIds.isEmpty() || itemIds.contains(i.getEnvioBoletoId()))
                .filter(i -> i.getStatus() == StatusEnvioBoleto.PRONTO_PARA_ENVIO
                        || i.getStatus() == StatusEnvioBoleto.ERRO)
                .collect(Collectors.toList());
    }

    public List<String> parseBloqueios(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return List.of(joined.split("\\|"));
    }
}
