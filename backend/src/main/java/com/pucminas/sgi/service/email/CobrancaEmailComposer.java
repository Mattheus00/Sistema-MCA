package com.pucminas.sgi.service.email;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.util.MoneyUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CobrancaEmailComposer {

    private final DividaRepository dividaRepository;

    public CobrancaEmailContexto montar(Cliente cliente, UUID dividaId) {
        if (dividaId != null) {
            return montarDividaUnica(cliente, dividaId);
        }
        return montarAgregado(cliente);
    }

    public String renderizarTexto(CobrancaEmailContexto ctx) {
        return ctx.texto();
    }

    public String renderizarHtml(String nomeEscritorio, CobrancaEmailContexto ctx) {
        if (ctx.dividaUnica() != null) {
            Divida d = ctx.dividaUnica();
            BigDecimal jurosCentavos = d.getValorDevedor().subtract(d.getValorOriginal()).max(BigDecimal.ZERO);
            return CobrancaEmailHtmlBuilder.htmlCobrancaDividaUnica(
                    nomeEscritorio,
                    ctx.nomeCliente(),
                    d.getProtocolo(),
                    d.getVencimento(),
                    CobrancaEmailHtmlBuilder.centavosParaReais(jurosCentavos),
                    CobrancaEmailHtmlBuilder.centavosParaReais(d.getValorDevedor()));
        }
        BigDecimal jurosTotalCentavos = ctx.dividasAgregadas().stream()
                .map(d -> d.getValorDevedor().subtract(d.getValorOriginal()).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<CobrancaEmailHtmlBuilder.LinhaResumo> linhas = ctx.dividasAgregadas().stream()
                .map(d -> new CobrancaEmailHtmlBuilder.LinhaResumo(
                        d.getProtocolo(),
                        d.getVencimento(),
                        CobrancaEmailHtmlBuilder.centavosParaReais(d.getValorDevedor())))
                .toList();
        return CobrancaEmailHtmlBuilder.htmlCobrancaAgregada(
                nomeEscritorio,
                ctx.nomeCliente(),
                linhas,
                CobrancaEmailHtmlBuilder.centavosParaReais(jurosTotalCentavos),
                CobrancaEmailHtmlBuilder.centavosParaReais(ctx.valorDevido()));
    }

    private CobrancaEmailContexto montarDividaUnica(Cliente cliente, UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        if (!d.getCliente().getClienteId().equals(cliente.getClienteId())) {
            throw new BusinessRuleException("Dívida não pertence ao cliente informado.");
        }
        if (d.getValorDevedor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Dívida já está quitada.");
        }
        String protocolo = d.getProtocolo();
        String vencimento = d.getVencimento().toString();
        String descricao = d.getDescricao() != null ? d.getDescricao() : "-";
        String assunto = "Cobrança - Débito em Aberto - " + protocolo;

        StringBuilder corpoBuilder = new StringBuilder();
        corpoBuilder.append("Prezado(a) ").append(cliente.getNome()).append(",\n\n");
        corpoBuilder.append("Identificamos um débito em aberto no valor de R$ ")
                .append(MoneyUtil.centavosParaReais(d.getValorDevedor())).append(".\n\n");
        corpoBuilder.append("Protocolo: ").append(protocolo)
                .append("\nVencimento: ").append(vencimento)
                .append("\nDescrição: ").append(descricao);
        if (d.getItensServicos() != null && !d.getItensServicos().isEmpty()) {
            corpoBuilder.append("\n\nServiços prestados:\n");
            d.getItensServicos().forEach(item -> corpoBuilder.append("  - ")
                    .append(item.getServico().getNome())
                    .append(": R$ ")
                    .append(MoneyUtil.centavosParaReais(item.getValor()))
                    .append("\n"));
        }
        corpoBuilder.append("\n\nPor favor, regularize sua situação.\n\nAtenciosamente,\nEscritório de Contabilidade");
        return new CobrancaEmailContexto(
                cliente.getNome(),
                d.getValorDevedor(),
                protocolo,
                vencimento,
                descricao,
                assunto,
                corpoBuilder.toString(),
                d,
                List.of());
    }

    private CobrancaEmailContexto montarAgregado(Cliente cliente) {
        UUID clienteId = cliente.getClienteId();
        List<Divida> abertas = new ArrayList<>(
                dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.EM_ABERTO));
        abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.PARCIAL));
        abertas.addAll(dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.VENCIDA));
        BigDecimal valorDevido = abertas.stream().map(Divida::getValorDevedor).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (valorDevido.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Cliente não possui débitos em aberto.");
        }
        StringBuilder corpoBuilder = new StringBuilder();
        corpoBuilder.append("Prezado(a) ").append(cliente.getNome()).append(",\n\n");
        corpoBuilder.append("Identificamos débitos em aberto no valor total de R$ ")
                .append(MoneyUtil.centavosParaReais(valorDevido)).append(".\n\n");
        for (Divida d : abertas) {
            corpoBuilder.append("Protocolo: ").append(d.getProtocolo())
                    .append(" - Vencimento: ").append(d.getVencimento())
                    .append(" - Valor: R$ ").append(MoneyUtil.centavosParaReais(d.getValorDevedor())).append("\n");
        }
        corpoBuilder.append("\nPor favor, regularize sua situação.\n\nAtenciosamente,\nEscritório de Contabilidade");
        return new CobrancaEmailContexto(
                cliente.getNome(),
                valorDevido,
                "-",
                "-",
                "Múltiplos débitos",
                "Cobrança - Débitos em Aberto",
                corpoBuilder.toString(),
                null,
                abertas);
    }

    public record CobrancaEmailContexto(
            String nomeCliente,
            BigDecimal valorDevido,
            String protocolo,
            String vencimento,
            String descricao,
            String assunto,
            String texto,
            Divida dividaUnica,
            List<Divida> dividasAgregadas
    ) {
    }
}
