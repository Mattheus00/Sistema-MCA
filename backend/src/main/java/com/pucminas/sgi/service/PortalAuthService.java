package com.pucminas.sgi.service;

import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.dto.request.PortalAtivarRequestDTO;
import com.pucminas.sgi.dto.request.PortalLoginRequestDTO;
import com.pucminas.sgi.dto.request.PortalRecuperarSenhaRequestDTO;
import com.pucminas.sgi.dto.response.PortalLoginResponseDTO;
import com.pucminas.sgi.dto.response.PortalMeResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.ClientePortalCredencial;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusPortalCredencial;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ClientePortalCredencialRepository;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.util.DocumentoUtil;
import com.pucminas.sgi.util.MoneyUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PortalAuthService {

    private static final Logger log = LoggerFactory.getLogger(PortalAuthService.class);

    private final ClienteRepository clienteRepository;
    private final ClientePortalCredencialRepository credencialRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final ClienteService clienteService;

    public PortalAuthService(ClienteRepository clienteRepository,
                             ClientePortalCredencialRepository credencialRepository,
                             JwtTokenProvider jwtTokenProvider,
                             PasswordEncoder passwordEncoder,
                             ClienteService clienteService) {
        this.clienteRepository = clienteRepository;
        this.credencialRepository = credencialRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.clienteService = clienteService;
    }

    @Transactional
    public PortalLoginResponseDTO ativar(PortalAtivarRequestDTO dto) {
        validarSenhasIguais(dto.getSenha(), dto.getConfirmarSenha());
        Cliente cliente = buscarClienteAtivo(dto.getCpfCnpj());
        validarPortalHabilitado(cliente);
        validarEmail(cliente, dto.getEmail());
        if (credencialRepository.existsByCliente_ClienteId(cliente.getClienteId())) {
            throw new BusinessRuleException("Portal já ativado para este cliente. Faça login ou recupere a senha.");
        }
        ClientePortalCredencial credencial = ClientePortalCredencial.builder()
                .cliente(cliente)
                .senha(passwordEncoder.encode(dto.getSenha()))
                .status(StatusPortalCredencial.ATIVO)
                .build();
        credencialRepository.save(credencial);
        log.info("Portal ativado para cliente {}", cliente.getClienteId());
        return montarLoginResponse(cliente);
    }

    @Transactional
    public PortalLoginResponseDTO login(PortalLoginRequestDTO dto) {
        Cliente cliente = buscarClienteAtivo(dto.getCpfCnpj());
        validarPortalHabilitado(cliente);
        ClientePortalCredencial credencial = credencialRepository.findByCliente_ClienteId(cliente.getClienteId())
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException(
                        "Portal não ativado. Use primeiro acesso."));
        if (credencial.getStatus() != StatusPortalCredencial.ATIVO) {
            throw new org.springframework.security.authentication.BadCredentialsException("Acesso ao portal bloqueado.");
        }
        if (!passwordEncoder.matches(dto.getSenha(), credencial.getSenha())) {
            throw new org.springframework.security.authentication.BadCredentialsException("CPF/CNPJ ou senha inválidos.");
        }
        credencial.setUltimoAcesso(LocalDateTime.now());
        credencialRepository.save(credencial);
        return montarLoginResponse(cliente);
    }

    @Transactional
    public void recuperarSenha(PortalRecuperarSenhaRequestDTO dto) {
        validarSenhasIguais(dto.getNovaSenha(), dto.getConfirmarSenha());
        Cliente cliente = buscarClienteAtivo(dto.getCpfCnpj());
        validarEmail(cliente, dto.getEmail());
        ClientePortalCredencial credencial = credencialRepository.findByCliente_ClienteId(cliente.getClienteId())
                .orElseThrow(() -> new BusinessRuleException("Portal não ativado para este cliente."));
        credencial.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        credencial.setStatus(StatusPortalCredencial.ATIVO);
        credencialRepository.save(credencial);
        log.info("Senha do portal redefinida para cliente {}", cliente.getClienteId());
    }

    @Transactional(readOnly = true)
    public PortalMeResponseDTO me(UUID clienteId) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new BusinessRuleException("Cliente não encontrado."));
        return toMeDto(cliente);
    }

    private PortalLoginResponseDTO montarLoginResponse(Cliente cliente) {
        String token = jwtTokenProvider.generatePortalToken(cliente.getClienteId(), cliente.getNome());
        return PortalLoginResponseDTO.builder()
                .token(token)
                .clienteId(cliente.getClienteId())
                .nome(cliente.getNome())
                .cpfCnpjMascarado(DocumentoUtil.mascararDocumento(cliente.getCpfCnpj()))
                .email(cliente.getEmail())
                .build();
    }

    private PortalMeResponseDTO toMeDto(Cliente cliente) {
        return PortalMeResponseDTO.builder()
                .clienteId(cliente.getClienteId())
                .codigo(cliente.getCodigo())
                .nome(cliente.getNome())
                .cpfCnpjMascarado(DocumentoUtil.mascararDocumento(cliente.getCpfCnpj()))
                .email(cliente.getEmail())
                .celular(cliente.getCelular())
                .saldoDevedorTotal(MoneyUtil.centavosParaReais(
                        clienteService.calcularSaldoDevedor(cliente.getClienteId())))
                .build();
    }

    private Cliente buscarClienteAtivo(String cpfCnpj) {
        String digitos = DocumentoUtil.normalizarDocumento(cpfCnpj);
        if (digitos == null || digitos.isBlank()) {
            throw new BusinessRuleException("CPF/CNPJ inválido.");
        }
        return clienteRepository.findByCpfCnpjDigitos(digitos)
                .filter(c -> c.getStatusCliente() == StatusCliente.ATIVO)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException(
                        "CPF/CNPJ ou senha inválidos."));
    }

    private static void validarPortalHabilitado(Cliente cliente) {
        if (Boolean.FALSE.equals(cliente.getPortalHabilitado())) {
            throw new BusinessRuleException("Acesso ao portal não está habilitado. Contate o escritório.");
        }
    }

    private static void validarEmail(Cliente cliente, String emailInformado) {
        if (cliente.getEmail() == null || cliente.getEmail().isBlank()) {
            throw new BusinessRuleException("E-mail não cadastrado. Contate o escritório.");
        }
        if (!cliente.getEmail().trim().equalsIgnoreCase(emailInformado.trim())) {
            throw new BusinessRuleException("E-mail não confere com o cadastro.");
        }
    }

    private static void validarSenhasIguais(String senha, String confirmar) {
        if (senha == null || !senha.equals(confirmar)) {
            throw new BusinessRuleException("Senha e confirmação não conferem.");
        }
    }
}
