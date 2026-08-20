package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.PortalDocumentoDTO;
import com.pucminas.sgi.dto.response.ResumoDocumentosClientesDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.portal.PortalAccessGuard;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DocumentoClienteRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class DocumentoClienteService {

    private final DocumentoClienteRepository documentoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final DocumentoClienteStorageService storageService;
    private final PortalAccessGuard portalAccessGuard;

    public DocumentoClienteService(DocumentoClienteRepository documentoRepository,
                                 ClienteRepository clienteRepository,
                                 UsuarioRepository usuarioRepository,
                                 DocumentoClienteStorageService storageService,
                                 PortalAccessGuard portalAccessGuard) {
        this.documentoRepository = documentoRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.storageService = storageService;
        this.portalAccessGuard = portalAccessGuard;
    }

    @Transactional
    public PortalDocumentoDTO enviar(UUID clienteId,
                                     MultipartFile arquivo,
                                     TipoDocumentoCliente tipo,
                                     UUID dividaId,
                                     String observacao) {
        if (tipo == null) {
            throw new BusinessRuleException("Tipo do documento é obrigatório.");
        }
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        Divida divida = null;
        if (dividaId != null) {
            divida = portalAccessGuard.carregarDividaDoCliente(dividaId, clienteId);
        }
        UUID documentoId = UUID.randomUUID();
        DocumentoClienteStorageService.ArquivoSalvo salvo =
                storageService.salvar(clienteId, documentoId, arquivo);
        DocumentoCliente doc = DocumentoCliente.builder()
                .documentoId(documentoId)
                .cliente(cliente)
                .divida(divida)
                .tipo(tipo)
                .nomeOriginal(arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename() : "documento")
                .nomeArmazenado(salvo.nomeArmazenado())
                .contentType(salvo.contentType())
                .tamanhoBytes(salvo.tamanho())
                .hashSha256(salvo.hashSha256())
                .observacaoCliente(observacao)
                .status(StatusDocumentoCliente.RECEBIDO)
                .build();
        doc = documentoRepository.save(doc);
        return toDto(doc);
    }

    @Transactional(readOnly = true)
    public Page<PortalDocumentoDTO> listarDoCliente(UUID clienteId, Pageable pageable) {
        return documentoRepository.findByCliente_ClienteIdOrderByEnviadoEmDesc(clienteId, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PortalDocumentoDTO> listarStaff(UUID clienteId,
                                                 StatusDocumentoCliente status,
                                                 TipoDocumentoCliente tipo,
                                                 Pageable pageable) {
        return documentoRepository.buscar(clienteId, status, tipo, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public PortalDocumentoDTO obter(UUID documentoId) {
        DocumentoCliente doc = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento", documentoId));
        return toDto(doc);
    }

    @Transactional(readOnly = true)
    public DocumentoCliente carregarParaCliente(UUID documentoId, UUID clienteId) {
        return documentoRepository.findByDocumentoIdAndCliente_ClienteId(documentoId, clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento", documentoId));
    }

    @Transactional(readOnly = true)
    public DocumentoCliente carregar(UUID documentoId) {
        return documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento", documentoId));
    }

    @Transactional(readOnly = true)
    public byte[] lerArquivo(DocumentoCliente doc) {
        return storageService.ler(
                doc.getCliente().getClienteId(),
                doc.getDocumentoId(),
                doc.getNomeArmazenado());
    }

    @Transactional
    public PortalDocumentoDTO atualizarStatus(UUID documentoId, StatusDocumentoCliente status) {
        DocumentoCliente doc = carregar(documentoId);
        doc.setStatus(status);
        return toDto(documentoRepository.save(doc));
    }

    @Transactional
    public PortalDocumentoDTO responder(UUID documentoId, String resposta, UUID usuarioId) {
        DocumentoCliente doc = carregar(documentoId);
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        doc.setRespostaEscritorio(resposta != null ? resposta.trim() : null);
        doc.setRespondidoEm(LocalDateTime.now());
        doc.setRespondidoPor(usuario);
        if (doc.getStatus() == StatusDocumentoCliente.RECEBIDO) {
            doc.setStatus(StatusDocumentoCliente.EM_ANALISE);
        }
        return toDto(documentoRepository.save(doc));
    }

    @Transactional(readOnly = true)
    public ResumoDocumentosClientesDTO resumo() {
        return ResumoDocumentosClientesDTO.builder()
                .recebidos(documentoRepository.countByStatus(StatusDocumentoCliente.RECEBIDO))
                .emAnalise(documentoRepository.countByStatus(StatusDocumentoCliente.EM_ANALISE))
                .arquivados(documentoRepository.countByStatus(StatusDocumentoCliente.ARQUIVADO))
                .build();
    }

    private PortalDocumentoDTO toDto(DocumentoCliente doc) {
        Cliente cliente = doc.getCliente();
        return PortalDocumentoDTO.builder()
                .documentoId(doc.getDocumentoId())
                .clienteId(cliente != null ? cliente.getClienteId() : null)
                .clienteNome(cliente != null ? cliente.getNome() : null)
                .clienteCodigo(cliente != null ? cliente.getCodigo() : null)
                .dividaId(doc.getDivida() != null ? doc.getDivida().getDividaId() : null)
                .protocoloDivida(doc.getDivida() != null ? doc.getDivida().getProtocolo() : null)
                .tipo(doc.getTipo())
                .status(doc.getStatus())
                .nomeOriginal(doc.getNomeOriginal())
                .contentType(doc.getContentType())
                .tamanhoBytes(doc.getTamanhoBytes())
                .observacaoCliente(doc.getObservacaoCliente())
                .respostaEscritorio(doc.getRespostaEscritorio())
                .respondidoEm(doc.getRespondidoEm())
                .respondidoPorNome(doc.getRespondidoPor() != null ? doc.getRespondidoPor().getNome() : null)
                .enviadoEm(doc.getEnviadoEm())
                .build();
    }
}
