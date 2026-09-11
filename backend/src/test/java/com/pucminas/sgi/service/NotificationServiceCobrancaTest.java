package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.service.email.CobrancaEmailComposer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceCobrancaTest {

    @Mock NotificacaoEmailRepository notificacaoRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock DividaRepository dividaRepository;
    @Mock EmailGateway emailGateway;
    @Mock BoletoArquivoValidator boletoArquivoValidator;
    @Mock CobrancaEmailComposer cobrancaEmailComposer;

    @Test
    void enviarCobrancaMontaRenderizaEEnvia() {
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = Cliente.builder().clienteId(clienteId).nome("Ana").email("ana@x.com").build();
        var ctx = new CobrancaEmailComposer.CobrancaEmailContexto(
                "Ana", new BigDecimal("1000"), "P", "2026-01-01", "d",
                "Cobrança - Débito em Aberto - P", "texto", null, java.util.List.of());
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.of(cliente));
        when(emailGateway.hasConfigAtiva()).thenReturn(true);
        when(cobrancaEmailComposer.montar(cliente, null)).thenReturn(ctx);
        when(cobrancaEmailComposer.renderizarTexto(ctx)).thenReturn("texto");
        when(cobrancaEmailComposer.renderizarHtml("Escritório", ctx)).thenReturn("<html/>");
        when(notificacaoRepository.save(any(NotificacaoEmail.class))).thenAnswer(inv -> {
            NotificacaoEmail n = inv.getArgument(0);
            if (n.getNotificacaoId() == null) {
                n.setNotificacaoId(UUID.randomUUID());
            }
            return n;
        });

        NotificationService service = new NotificationService(
                notificacaoRepository, clienteRepository, dividaRepository, emailGateway,
                boletoArquivoValidator, cobrancaEmailComposer, "Escritório", 5);

        var resp = service.enviarCobrancaEmail(clienteId, null);

        assertThat(resp.getStatusEnvio()).isEqualTo(StatusEnvio.ENVIADO);
        verify(emailGateway).enviarTextoEHtml("ana@x.com", ctx.assunto(), "texto", "<html/>");
    }
}
