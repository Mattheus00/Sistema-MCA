package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.portal.PortalAccessGuard;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DocumentoClienteRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DocumentoClienteService")
class DocumentoClienteServiceTest {

    @Mock
    private DocumentoClienteRepository documentoRepository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private DocumentoClienteStorageService storageService;
    @Mock
    private PortalAccessGuard portalAccessGuard;

    @InjectMocks
    private DocumentoClienteService service;

    private static final UUID DOCUMENTO_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CLIENTE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID USUARIO_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    @DisplayName("responder grava resposta e muda status RECEBIDO para EM_ANALISE")
    void responder() {
        Cliente cliente = Cliente.builder()
                .clienteId(CLIENTE_ID)
                .nome("Matheus")
                .codigo("101")
                .build();
        DocumentoCliente doc = DocumentoCliente.builder()
                .documentoId(DOCUMENTO_ID)
                .cliente(cliente)
                .tipo(TipoDocumentoCliente.COMPROVANTE)
                .status(StatusDocumentoCliente.RECEBIDO)
                .nomeOriginal("comprovante.pdf")
                .nomeArmazenado("stored.pdf")
                .contentType("application/pdf")
                .tamanhoBytes(1024)
                .hashSha256("abc")
                .enviadoEm(LocalDateTime.now())
                .build();
        Usuario usuario = Usuario.builder()
                .usuarioId(USUARIO_ID)
                .nome("José Carlos")
                .build();

        when(documentoRepository.findById(DOCUMENTO_ID)).thenReturn(Optional.of(doc));
        when(usuarioRepository.findById(USUARIO_ID)).thenReturn(Optional.of(usuario));
        when(documentoRepository.save(any(DocumentoCliente.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = service.responder(DOCUMENTO_ID, "Recebemos o documento.", USUARIO_ID);

        assertEquals("Recebemos o documento.", dto.getRespostaEscritorio());
        assertEquals(StatusDocumentoCliente.EM_ANALISE, dto.getStatus());
        assertEquals("José Carlos", dto.getRespondidoPorNome());
        assertEquals(CLIENTE_ID, dto.getClienteId());
        assertEquals("Matheus", dto.getClienteNome());
        verify(documentoRepository).save(doc);
    }

    @Test
    @DisplayName("responder com documento inexistente lança 404")
    void responder_naoEncontrado() {
        when(documentoRepository.findById(DOCUMENTO_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.responder(DOCUMENTO_ID, "ok", USUARIO_ID));
    }

    @Test
    @DisplayName("resumo conta documentos por status")
    void resumo() {
        when(documentoRepository.countByStatus(StatusDocumentoCliente.RECEBIDO)).thenReturn(3L);
        when(documentoRepository.countByStatus(StatusDocumentoCliente.EM_ANALISE)).thenReturn(1L);
        when(documentoRepository.countByStatus(StatusDocumentoCliente.ARQUIVADO)).thenReturn(10L);

        var resumo = service.resumo();

        assertEquals(3L, resumo.getRecebidos());
        assertEquals(1L, resumo.getEmAnalise());
        assertEquals(10L, resumo.getArquivados());
    }
}
