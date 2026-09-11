package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LoteEnvioBoletoRelatorioServiceTest {

    private final LoteEnvioBoletoRelatorioService service = new LoteEnvioBoletoRelatorioService();

    @Test
    void geraCsvComCabecalhoEEscapaPontoEVirgula() {
        EnvioBoleto item = EnvioBoleto.builder()
                .cliente(Cliente.builder().nome("Cliente; X").build())
                .emailDestinatario("a@b.com")
                .nomeArquivoOriginal("boleto.pdf")
                .status(StatusEnvioBoleto.ENVIADO)
                .dataEnvio(LocalDateTime.of(2026, 1, 2, 10, 0))
                .mensagemErro(null)
                .simulado(false)
                .build();
        LoteEnvioBoleto lote = LoteEnvioBoleto.builder().itens(List.of(item)).build();

        String csv = service.gerarCsv(lote);

        assertThat(csv).startsWith("cliente;email;arquivo;status;data_envio;mensagem_erro;simulado\n");
        assertThat(csv).contains("\"Cliente; X\"");
        assertThat(csv).contains("ENVIADO");
        assertThat(csv).contains("false");
    }

    @Test
    void csvVazioQuandoValorNulo() {
        assertThat(LoteEnvioBoletoRelatorioService.csv(null)).isEmpty();
        assertThat(LoteEnvioBoletoRelatorioService.csv("ok")).isEqualTo("ok");
    }
}
