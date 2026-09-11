package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.EnviarLoteRequest;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusEnvioBoleto;
import com.pucminas.sgi.enums.StatusLoteEnvioBoleto;
import com.pucminas.sgi.exception.ConflictException;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.mapper.LoteEnvioBoletoMapper;
import com.pucminas.sgi.repository.EnvioBoletoRepository;
import com.pucminas.sgi.repository.LoteEnvioBoletoRepository;
import com.pucminas.sgi.security.EnvioBoletoAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoteEnvioBoletoEnvioServiceTest {

    @Mock LoteEnvioBoletoRepository loteRepository;
    @Mock EnvioBoletoRepository envioBoletoRepository;
    @Mock EnvioBoletoAccessService accessService;
    @Mock BoletoArquivoStorageService storageService;
    @Mock EnvioBoletoEmailService emailService;
    @Mock AuditoriaService auditoriaService;
    @Mock PlatformTransactionManager transactionManager;

    private LoteEnvioBoletoEnvioService service;
    private LoteEnvioBoletoValidacaoService validacao;

    @BeforeEach
    void setUp() {
        validacao = new LoteEnvioBoletoValidacaoService(loteRepository, envioBoletoRepository, new LoteEnvioBoletoMapper());
        service = new LoteEnvioBoletoEnvioService(
                loteRepository, envioBoletoRepository, accessService, storageService, emailService,
                auditoriaService, new LoteEnvioBoletoMapper(), validacao, transactionManager,
                Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC));
        when(transactionManager.getTransaction(any())).thenReturn(org.mockito.Mockito.mock(TransactionStatus.class));
    }

    @Test
    void loteJaEmEnvioRetornaConflito() {
        UUID loteId = UUID.randomUUID();
        LoteEnvioBoleto lote = LoteEnvioBoleto.builder()
                .loteId(loteId)
                .status(StatusLoteEnvioBoleto.PROCESSANDO)
                .itens(new ArrayList<>())
                .build();
        when(loteRepository.lockById(loteId)).thenReturn(Optional.of(lote));

        assertThatThrownBy(() -> service.enviar(UUID.randomUUID(), loteId, new EnviarLoteRequest()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("já está em envio");
    }

    @Test
    void enviaForaDaTransacaoEPersisteResultado() {
        UUID usuarioId = UUID.randomUUID();
        UUID loteId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Usuario usuario = Usuario.builder().usuarioId(usuarioId).nome("Fin").telefone("1").senha("x").build();
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cli")
                .email("c@x.com")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        EnvioBoleto item = EnvioBoleto.builder()
                .envioBoletoId(itemId)
                .nomeArquivoOriginal("b.pdf")
                .nomeArquivoArmazenado("stored.pdf")
                .cliente(cliente)
                .emailDestinatario("c@x.com")
                .status(StatusEnvioBoleto.PRONTO_PARA_ENVIO)
                .confiancaIdentificacao(ConfiancaIdentificacaoBoleto.ALTA)
                .confirmadoPeloUsuario(true)
                .possivelDuplicidade(false)
                .quantidadeTentativas(0)
                .reenvio(false)
                .simulado(false)
                .build();
        LoteEnvioBoleto lote = LoteEnvioBoleto.builder()
                .loteId(loteId)
                .usuarioResponsavel(usuario)
                .status(StatusLoteEnvioBoleto.AGUARDANDO_CONFERENCIA)
                .itens(new ArrayList<>(java.util.List.of(item)))
                .build();
        item.setLote(lote);

        when(loteRepository.lockById(loteId)).thenReturn(Optional.of(lote));
        when(loteRepository.findById(loteId)).thenReturn(Optional.of(lote));
        when(loteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(envioBoletoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(envioBoletoRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(storageService.ler(loteId, "stored.pdf")).thenReturn("%PDF".getBytes());
        when(accessService.assertPodeGerenciarBoletos(usuarioId)).thenReturn(usuario);

        var resp = service.enviar(usuarioId, loteId, null);

        verify(emailService).enviarBoleto(item, "%PDF".getBytes());
        assertThat(resp.getEnviados()).isEqualTo(1);
        assertThat(resp.getErros()).isZero();
        assertThat(resp.getStatusLote()).isEqualTo(StatusLoteEnvioBoleto.CONCLUIDO.name());
        assertThat(item.getStatus()).isEqualTo(StatusEnvioBoleto.ENVIADO);
    }

    @Test
    void falhaSmtpPersisteErroForaDaTransacaoInicial() {
        UUID usuarioId = UUID.randomUUID();
        UUID loteId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Usuario usuario = Usuario.builder().usuarioId(usuarioId).nome("Fin").telefone("1").senha("x").build();
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cli")
                .email("c@x.com")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        EnvioBoleto item = EnvioBoleto.builder()
                .envioBoletoId(itemId)
                .nomeArquivoOriginal("b.pdf")
                .nomeArquivoArmazenado("stored.pdf")
                .cliente(cliente)
                .emailDestinatario("c@x.com")
                .status(StatusEnvioBoleto.PRONTO_PARA_ENVIO)
                .confiancaIdentificacao(ConfiancaIdentificacaoBoleto.ALTA)
                .confirmadoPeloUsuario(true)
                .possivelDuplicidade(false)
                .quantidadeTentativas(0)
                .reenvio(false)
                .simulado(false)
                .build();
        LoteEnvioBoleto lote = LoteEnvioBoleto.builder()
                .loteId(loteId)
                .usuarioResponsavel(usuario)
                .status(StatusLoteEnvioBoleto.AGUARDANDO_CONFERENCIA)
                .itens(new ArrayList<>(java.util.List.of(item)))
                .build();
        item.setLote(lote);

        when(loteRepository.lockById(loteId)).thenReturn(Optional.of(lote));
        when(loteRepository.findById(loteId)).thenReturn(Optional.of(lote));
        when(loteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(envioBoletoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(envioBoletoRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(storageService.ler(loteId, "stored.pdf")).thenReturn("%PDF".getBytes());
        when(accessService.assertPodeGerenciarBoletos(usuarioId)).thenReturn(usuario);
        org.mockito.Mockito.doThrow(new EmailSendException("SMTP indisponível"))
                .when(emailService).enviarBoleto(item, "%PDF".getBytes());

        var resp = service.enviar(usuarioId, loteId, null);

        assertThat(resp.getEnviados()).isZero();
        assertThat(resp.getErros()).isEqualTo(1);
        assertThat(resp.getStatusLote()).isEqualTo(StatusLoteEnvioBoleto.CONCLUIDO_COM_ERROS.name());
        assertThat(item.getStatus()).isEqualTo(StatusEnvioBoleto.ERRO);
        assertThat(item.getMensagemErro()).contains("SMTP");
    }
}
