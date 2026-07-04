package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ClienteDTO;
import com.pucminas.sgi.dto.response.ClienteResponseDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.DuplicateResourceException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.util.MoneyUtil;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço de clientes: CRUD, saldo devedor e status.
 */
@Service
public class ClienteService {

    private static final Logger log = LoggerFactory.getLogger(ClienteService.class);

    private final ClienteRepository clienteRepository;
    private final DividaRepository dividaRepository;
    private final DividaService dividaService;

    public ClienteService(ClienteRepository clienteRepository, DividaRepository dividaRepository,
                          DividaService dividaService) {
        this.clienteRepository = clienteRepository;
        this.dividaRepository = dividaRepository;
        this.dividaService = dividaService;
    }

    @Transactional
    public ClienteResponseDTO cadastrarCliente(ClienteDTO dto) {
        normalizarDto(dto);
        validarCodigoUnico(null, dto.getCodigo());
        Cliente c = Cliente.builder()
                .codigo(dto.getCodigo())
                .nome(dto.getNome().trim())
                .cpfCnpj(dto.getCpfCnpj())
                .email(dto.getEmail())
                .celular(dto.getCelular())
                .endereco(dto.getEndereco())
                .statusCliente(dto.getStatusCliente() != null ? dto.getStatusCliente() : StatusCliente.ATIVO)
                .saldoDevedor(dto.getSaldoDevedor() != null ? dto.getSaldoDevedor() : BigDecimal.ZERO)
                .criadoEm(LocalDateTime.now())
                .atualizadoEm(LocalDateTime.now())
                .build();
        c = clienteRepository.save(c);
        log.info("Cliente cadastrado: {} - {}", c.getClienteId(), c.getNome());
        return toResponse(c);
    }

    @Transactional
    public ClienteResponseDTO atualizarCliente(UUID clienteId, ClienteDTO dto) {
        normalizarDto(dto);
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        validarCodigoUnico(clienteId, dto.getCodigo());
        c.setCodigo(dto.getCodigo());
        c.setNome(dto.getNome().trim());
        c.setCpfCnpj(dto.getCpfCnpj());
        c.setEmail(dto.getEmail());
        c.setCelular(dto.getCelular());
        c.setEndereco(dto.getEndereco());
        if (dto.getStatusCliente() != null) c.setStatusCliente(dto.getStatusCliente());
        c = clienteRepository.save(c);
        return toResponse(c);
    }

    /** Atualização parcial (PATCH). Com {@code nome} + {@code cpfCnpj} no body, trata como
     *  salvamento do modal e substitui campos opcionais (omitidos ou vazios viram {@code null}). */
    @Transactional
    public ClienteResponseDTO atualizarClientePartial(UUID clienteId, ClienteDTO dto) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));

        if (dto.getNome() != null && dto.getCpfCnpj() != null) {
            aplicarSalvamentoCompleto(c, clienteId, dto);
        } else {
            aplicarPatchParcial(c, clienteId, dto);
        }

        c = clienteRepository.save(c);
        return toResponse(c);
    }

    private void aplicarSalvamentoCompleto(Cliente c, UUID clienteId, ClienteDTO dto) {
        validarCodigoUnico(clienteId, dto.getCodigo());
        c.setCodigo(dto.getCodigo());
        c.setNome(dto.getNome().trim());
        String cpfCnpj = TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj());
        c.setCpfCnpj(cpfCnpj);
        c.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        c.setCelular(normalizarCelular(dto.getCelular()));
        c.setEndereco(normalizarEndereco(dto.getEndereco()));
        if (dto.getStatusCliente() != null) {
            c.setStatusCliente(dto.getStatusCliente());
        }
    }

    private void aplicarPatchParcial(Cliente c, UUID clienteId, ClienteDTO dto) {
        if (dto.getCodigo() != null) {
            validarCodigoUnico(clienteId, dto.getCodigo());
            c.setCodigo(dto.getCodigo());
        }
        if (dto.getNome() != null) c.setNome(dto.getNome().trim());
        if (dto.getCpfCnpj() != null) {
            c.setCpfCnpj(TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj()));
        }
        if (dto.getEmail() != null) {
            c.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        }
        if (dto.getCelular() != null) {
            c.setCelular(normalizarCelular(dto.getCelular()));
        }
        if (dto.getEndereco() != null) {
            c.setEndereco(normalizarEndereco(dto.getEndereco()));
        }
        if (dto.getStatusCliente() != null) c.setStatusCliente(dto.getStatusCliente());
    }

    private static String normalizarCelular(String celular) {
        String normalizado = TelefoneClienteUtil.normalizarOpcional(celular);
        TelefoneClienteUtil.validarCelular(normalizado);
        return normalizado;
    }

    private void validarCodigoUnico(UUID clienteId, String codigo) {
        if (codigo == null || codigo.isBlank()) {
            return;
        }
        clienteRepository.findByCodigo(codigo).ifPresent(outro -> {
            if (clienteId == null || !outro.getClienteId().equals(clienteId)) {
                throw new DuplicateResourceException("Código já cadastrado para outro cliente");
            }
        });
    }

    private static String normalizarCodigo(String codigo) {
        if (codigo == null) {
            return null;
        }
        String trimmed = codigo.trim();
        return trimmed.isEmpty() ? null : trimmed.toUpperCase();
    }

    private static String normalizarEndereco(String endereco) {
        if (endereco == null) {
            return null;
        }
        String trimmed = endereco.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Exclusão lógica: marca cliente como INATIVO. */
    @Transactional
    public void excluirCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        c.setStatusCliente(StatusCliente.INATIVO);
        clienteRepository.save(c);
        log.info("Cliente desativado (soft delete): {}", clienteId);
    }

    @Transactional(readOnly = true)
    public ClienteResponseDTO consultarCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> listarClientes(String busca, StatusCliente status, Pageable pageable) {
        String termo = (busca != null && !busca.isBlank()) ? busca.trim() : null;
        String digitos = termo != null ? TelefoneClienteUtil.apenasDigitos(termo) : null;
        if (digitos != null && digitos.isEmpty()) {
            digitos = null;
        }
        boolean filtrarStatus = status != null;
        boolean excluirInativo = status == null;
        return clienteRepository.buscar(status, filtrarStatus, excluirInativo, StatusCliente.INATIVO, termo, digitos, pageable)
                .map(this::toResponse);
    }

    /**
     * Calcula o saldo devedor do cliente (soma das dívidas em aberto ou parcial).
     */
    @Transactional(readOnly = true)
    public BigDecimal calcularSaldoDevedor(UUID clienteId) {
        return dividaRepository.sumValorDevedorByClienteId(clienteId, StatusDivida.emAberto());
    }

    /**
     * Recalcula e persiste o saldo devedor do cliente a partir das dívidas em aberto.
     * Chamado via ClienteStatusUpdateListener (após commit) para evitar SQLITE_BUSY.
     * O status ATIVO/INATIVO representa ativação/exclusão lógica do cadastro e NÃO é
     * derivado do saldo; por isso não é alterado aqui.
     */
    @Transactional
    public void atualizarStatusCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        BigDecimal saldo = calcularSaldoDevedor(clienteId);
        c.setSaldoDevedor(saldo);
        clienteRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<DividaResponseDTO> listarDividasPorCliente(UUID clienteId) {
        Cliente c = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        return dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .map(dividaService::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClienteResponseDTO> rankingMaioresDevedores(int limite) {
        List<Cliente> top = clienteRepository.findTop10ByOrderBySaldoDevedorDesc();
        if (limite > 0 && limite < top.size()) {
            top = top.subList(0, limite);
        }
        return top.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private ClienteResponseDTO toResponse(Cliente c) {
        return ClienteResponseDTO.builder()
                .clienteId(c.getClienteId())
                .codigo(c.getCodigo())
                .nome(c.getNome())
                .cpfCnpj(c.getCpfCnpj())
                .email(c.getEmail())
                .telefone(c.getTelefone())
                .celular(c.getCelular())
                .endereco(c.getEndereco())
                .statusCliente(c.getStatusCliente())
                .saldoDevedor(MoneyUtil.centavosParaReais(c.getSaldoDevedor()))
                .criadoEm(c.getCriadoEm())
                .atualizadoEm(c.getAtualizadoEm())
                .build();
    }

    private static void normalizarDto(ClienteDTO dto) {
        dto.setCodigo(normalizarCodigo(dto.getCodigo()));
        if (dto.getCpfCnpj() != null) {
            dto.setCpfCnpj(TelefoneClienteUtil.apenasDigitos(dto.getCpfCnpj()));
        }
        dto.setEmail(TelefoneClienteUtil.normalizarEValidarEmail(dto.getEmail()));
        dto.setCelular(TelefoneClienteUtil.normalizarOpcional(dto.getCelular()));
        if (dto.getEndereco() != null) {
            String endereco = dto.getEndereco().trim();
            dto.setEndereco(endereco.isEmpty() ? null : endereco);
        }
        TelefoneClienteUtil.validarCelular(dto.getCelular());
    }
}
