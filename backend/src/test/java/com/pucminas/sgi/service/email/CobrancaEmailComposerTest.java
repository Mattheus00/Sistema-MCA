package com.pucminas.sgi.service.email;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.DividaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CobrancaEmailComposerTest {

    @Mock DividaRepository dividaRepository;
    private CobrancaEmailComposer composer;

    @BeforeEach
    void setUp() {
        composer = new CobrancaEmailComposer(dividaRepository);
    }

    @Test
    void montaContextoDeDividaUnicaERenderizaHtml() {
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = Cliente.builder().clienteId(clienteId).nome("Maria").email("m@x.com").build();
        Divida divida = Divida.builder()
                .dividaId(UUID.randomUUID())
                .cliente(cliente)
                .protocolo("DIV-1")
                .descricao("Honorários")
                .vencimento(LocalDate.of(2026, 8, 1))
                .valorOriginal(new BigDecimal("10000"))
                .valorDevedor(new BigDecimal("11000"))
                .statusDivida(StatusDivida.VENCIDA)
                .build();
        when(dividaRepository.findById(divida.getDividaId())).thenReturn(Optional.of(divida));

        var ctx = composer.montar(cliente, divida.getDividaId());

        assertThat(ctx.assunto()).contains("DIV-1");
        assertThat(composer.renderizarTexto(ctx)).contains("Maria").contains("Honorários");
        assertThat(composer.renderizarHtml("Escritório", ctx)).contains("DIV-1").contains("Maria");
    }

    @Test
    void recusaDividaQuitada() {
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = Cliente.builder().clienteId(clienteId).nome("Maria").build();
        Divida divida = Divida.builder()
                .dividaId(UUID.randomUUID())
                .cliente(cliente)
                .protocolo("DIV-Q")
                .vencimento(LocalDate.now())
                .valorOriginal(BigDecimal.ZERO)
                .valorDevedor(BigDecimal.ZERO)
                .build();
        when(dividaRepository.findById(divida.getDividaId())).thenReturn(Optional.of(divida));

        assertThatThrownBy(() -> composer.montar(cliente, divida.getDividaId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("quitada");
    }

    @Test
    void agregaDebitosEmAberto() {
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = Cliente.builder().clienteId(clienteId).nome("João").build();
        Divida d1 = Divida.builder()
                .cliente(cliente)
                .protocolo("A")
                .vencimento(LocalDate.of(2026, 1, 1))
                .valorOriginal(new BigDecimal("1000"))
                .valorDevedor(new BigDecimal("1000"))
                .build();
        when(dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.EM_ABERTO))
                .thenReturn(List.of(d1));
        when(dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.PARCIAL))
                .thenReturn(List.of());
        when(dividaRepository.findByCliente_ClienteIdAndStatusDivida(clienteId, StatusDivida.VENCIDA))
                .thenReturn(List.of());

        var ctx = composer.montar(cliente, null);

        assertThat(ctx.assunto()).contains("Débitos em Aberto");
        assertThat(ctx.valorDevido()).isEqualByComparingTo("1000");
        assertThat(composer.renderizarHtml("Escritório", ctx)).contains("A");
    }
}
