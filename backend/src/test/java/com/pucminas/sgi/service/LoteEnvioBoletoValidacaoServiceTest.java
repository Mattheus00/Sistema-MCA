package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class LoteEnvioBoletoValidacaoServiceTest {

    @Mock LoteEnvioBoletoRepository loteRepository;
    @Mock EnvioBoletoRepository envioBoletoRepository;

    private LoteEnvioBoletoValidacaoService service;

    @BeforeEach
    void setUp() {
        service = new LoteEnvioBoletoValidacaoService(loteRepository, envioBoletoRepository, new LoteEnvioBoletoMapper());
    }

    @Test
    void calculaBloqueiosDeItemSemCliente() {
        EnvioBoleto item = EnvioBoleto.builder()
                .envioBoletoId(UUID.randomUUID())
                .status(StatusEnvioBoleto.AGUARDANDO_CORRECAO)
                .confiancaIdentificacao(ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO)
                .build();

        List<String> bloqueios = service.calcularBloqueiosItem(item, false);

        assertThat(bloqueios).anyMatch(b -> b.contains("Cliente não identificado"));
        assertThat(bloqueios).anyMatch(b -> b.contains("não está pronto"));
    }

    @Test
    void itemIgnoradoNaoTemBloqueio() {
        EnvioBoleto item = EnvioBoleto.builder()
                .status(StatusEnvioBoleto.IGNORADO)
                .build();
        assertThat(service.calcularBloqueiosItem(item, false)).isEmpty();
    }

    @Test
    void filtraSomenteItensProntosOuComErro() {
        UUID prontoId = UUID.randomUUID();
        EnvioBoleto pronto = EnvioBoleto.builder()
                .envioBoletoId(prontoId)
                .status(StatusEnvioBoleto.PRONTO_PARA_ENVIO)
                .build();
        EnvioBoleto ignorado = EnvioBoleto.builder()
                .envioBoletoId(UUID.randomUUID())
                .status(StatusEnvioBoleto.IGNORADO)
                .build();

        List<EnvioBoleto> candidatos = LoteEnvioBoletoValidacaoService.filtrarCandidatosEnvio(
                List.of(pronto, ignorado), null);

        assertThat(candidatos).extracting(EnvioBoleto::getEnvioBoletoId).containsExactly(prontoId);
    }

    @Test
    void validarBloqueiaLoteEmProcessamento() {
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("A")
                .email("a@x.com")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        EnvioBoleto item = EnvioBoleto.builder()
                .envioBoletoId(UUID.randomUUID())
                .cliente(cliente)
                .emailDestinatario("a@x.com")
                .status(StatusEnvioBoleto.PRONTO_PARA_ENVIO)
                .confiancaIdentificacao(ConfiancaIdentificacaoBoleto.ALTA)
                .confirmadoPeloUsuario(true)
                .possivelDuplicidade(false)
                .build();
        LoteEnvioBoleto lote = LoteEnvioBoleto.builder()
                .loteId(UUID.randomUUID())
                .status(StatusLoteEnvioBoleto.PROCESSANDO)
                .itens(List.of(item))
                .build();

        var resp = service.validar(lote);

        assertThat(resp.isPodeEnviar()).isFalse();
        assertThat(resp.getBloqueiosGerais()).contains("Lote em processamento.");
    }
}
