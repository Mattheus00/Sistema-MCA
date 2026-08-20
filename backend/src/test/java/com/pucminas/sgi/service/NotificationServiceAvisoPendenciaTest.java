package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.validator.BoletoArquivoValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService — aviso pendência PDF")
class NotificationServiceAvisoPendenciaTest {

    @Mock
    private NotificacaoEmailRepository notificacaoRepository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private EmailGateway emailGateway;
    @Mock
    private BoletoArquivoValidator boletoArquivoValidator;

    @Test
    @DisplayName("envia PDF por SMTP para o e-mail do cliente")
    void enviarAvisoPendenciaPdfSucesso() {
        UUID clienteId = UUID.randomUUID();
        Cliente cliente = Cliente.builder()
                .clienteId(clienteId)
                .nome("Matheus")
                .email("matheus@email.com")
                .build();
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.of(cliente));
        when(emailGateway.hasConfigAtiva()).thenReturn(true);
        when(dividaRepository.findByCliente_ClienteIdAndStatusDivida(eq(clienteId), any()))
                .thenReturn(java.util.List.of());
        when(notificacaoRepository.save(any(NotificacaoEmail.class))).thenAnswer(inv -> {
            NotificacaoEmail n = inv.getArgument(0);
            if (n.getNotificacaoId() == null) {
                n.setNotificacaoId(UUID.randomUUID());
            }
            assertNotNull(n.getValorComunicado());
            return n;
        });
        when(notificacaoRepository.saveAndFlush(any(NotificacaoEmail.class))).thenAnswer(inv -> {
            NotificacaoEmail n = inv.getArgument(0);
            if (n.getNotificacaoId() == null) {
                n.setNotificacaoId(UUID.randomUUID());
            }
            assertNotNull(n.getValorComunicado());
            return n;
        });

        MockMultipartFile pdf = new MockMultipartFile(
                "arquivo", "aviso.pdf", "application/pdf", "%PDF-1.4 conteudo".getBytes());

        NotificationService service = new NotificationService(
                notificacaoRepository, clienteRepository, dividaRepository,
                emailGateway, boletoArquivoValidator, "Escritório Teste", 5);

        var res = service.enviarAvisoPendenciaPdf(clienteId, pdf);

        assertEquals(StatusEnvio.ENVIADO, res.getStatusEnvio());
        assertEquals("matheus@email.com", res.getEmailDestino());
        verify(boletoArquivoValidator).validar(pdf);
        verify(emailGateway).enviarComAnexoPdf(
                eq("matheus@email.com"),
                contains("Aviso de pendência"),
                anyString(),
                anyString(),
                any(byte[].class),
                eq("aviso.pdf"));
    }

    @Test
    @DisplayName("rejeita cliente sem e-mail")
    void enviarSemEmail() {
        UUID clienteId = UUID.randomUUID();
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.of(
                Cliente.builder().clienteId(clienteId).nome("X").email("").build()));

        NotificationService service = new NotificationService(
                notificacaoRepository, clienteRepository, dividaRepository,
                emailGateway, boletoArquivoValidator, "Escritório", 5);

        MockMultipartFile pdf = new MockMultipartFile(
                "arquivo", "aviso.pdf", "application/pdf", "%PDF-1.4".getBytes());

        assertThrows(BusinessRuleException.class, () -> service.enviarAvisoPendenciaPdf(clienteId, pdf));
        verify(emailGateway, never()).enviarComAnexoPdf(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("cliente inexistente retorna 404")
    void clienteNaoEncontrado() {
        UUID clienteId = UUID.randomUUID();
        when(clienteRepository.findById(clienteId)).thenReturn(Optional.empty());

        NotificationService service = new NotificationService(
                notificacaoRepository, clienteRepository, dividaRepository,
                emailGateway, boletoArquivoValidator, "Escritório", 5);

        MockMultipartFile pdf = new MockMultipartFile(
                "arquivo", "aviso.pdf", "application/pdf", "%PDF-1.4".getBytes());

        assertThrows(ResourceNotFoundException.class, () -> service.enviarAvisoPendenciaPdf(clienteId, pdf));
    }
}
