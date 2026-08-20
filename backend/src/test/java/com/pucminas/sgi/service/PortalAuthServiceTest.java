package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.PortalAtivarRequestDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.ClientePortalCredencial;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ClientePortalCredencialRepository;
import com.pucminas.sgi.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PortalAuthService")
class PortalAuthServiceTest {

    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private ClientePortalCredencialRepository credencialRepository;
    @Mock
    private com.pucminas.sgi.config.JwtTokenProvider jwtTokenProvider;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ClienteService clienteService;

    @InjectMocks
    private PortalAuthService portalAuthService;

    private Cliente cliente;

    @BeforeEach
    void setUp() {
        cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cliente Teste")
                .cpfCnpj("03536558000184")
                .email("teste@email.com")
                .statusCliente(StatusCliente.ATIVO)
                .portalHabilitado(true)
                .saldoDevedor(BigDecimal.ZERO)
                .build();
    }

    @Test
    @DisplayName("ativar cria credencial quando e-mail confere")
    void ativarSucesso() {
        PortalAtivarRequestDTO dto = new PortalAtivarRequestDTO();
        dto.setCpfCnpj("03.536.558/0001-84");
        dto.setEmail("teste@email.com");
        dto.setSenha("senha1234");
        dto.setConfirmarSenha("senha1234");

        when(clienteRepository.findByCpfCnpjDigitos("03536558000184")).thenReturn(Optional.of(cliente));
        when(credencialRepository.existsByCliente_ClienteId(cliente.getClienteId())).thenReturn(false);
        when(passwordEncoder.encode("senha1234")).thenReturn("hash");
        when(jwtTokenProvider.generatePortalToken(cliente.getClienteId(), cliente.getNome())).thenReturn("token");

        var res = portalAuthService.ativar(dto);

        assertEquals("token", res.getToken());
        verify(credencialRepository).save(any(ClientePortalCredencial.class));
    }

    @Test
    @DisplayName("ativar rejeita e-mail diferente")
    void ativarEmailInvalido() {
        PortalAtivarRequestDTO dto = new PortalAtivarRequestDTO();
        dto.setCpfCnpj("03536558000184");
        dto.setEmail("outro@email.com");
        dto.setSenha("senha1234");
        dto.setConfirmarSenha("senha1234");

        when(clienteRepository.findByCpfCnpjDigitos("03536558000184")).thenReturn(Optional.of(cliente));

        assertThrows(BusinessRuleException.class, () -> portalAuthService.ativar(dto));
    }
}
