package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.ClienteResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ClienteService")
class ClienteServiceTest {

    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private DividaService dividaService;

    @InjectMocks
    private ClienteService clienteService;

    private static final UUID CLIENTE_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Test
    @DisplayName("atualizarStatusCliente: atualiza saldo sem alterar status do cadastro")
    void atualizarStatusCliente_preservaStatusCadastro() {
        Cliente cliente = Cliente.builder()
                .clienteId(CLIENTE_ID)
                .nome("Empresa X")
                .cpfCnpj("12345678000199")
                .statusCliente(StatusCliente.INATIVO)
                .saldoDevedor(BigDecimal.ZERO)
                .build();
        Divida divida = Divida.builder()
                .statusDivida(StatusDivida.EM_ABERTO)
                .valorDevedor(new BigDecimal("15000"))
                .build();
        when(clienteRepository.findById(CLIENTE_ID)).thenReturn(Optional.of(cliente));
        when(dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(CLIENTE_ID)).thenReturn(List.of(divida));
        when(dividaService.getValorEJurosReais(divida)).thenReturn(new BigDecimal[]{new BigDecimal("150.00"), BigDecimal.ZERO});

        clienteService.atualizarStatusCliente(CLIENTE_ID);

        assertEquals(new BigDecimal("15000"), cliente.getSaldoDevedor());
        assertEquals(StatusCliente.INATIVO, cliente.getStatusCliente());
        verify(clienteRepository).save(cliente);
    }

    @Test
    @DisplayName("calcularSaldoDevedor soma dívidas em aberto com juros em tempo real")
    void calcularSaldoDevedor() {
        Divida divida = Divida.builder()
                .statusDivida(StatusDivida.VENCIDA)
                .valorDevedor(new BigDecimal("5000"))
                .build();
        when(dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(CLIENTE_ID)).thenReturn(List.of(divida));
        when(dividaService.getValorEJurosReais(divida)).thenReturn(new BigDecimal[]{new BigDecimal("50.16"), new BigDecimal("0.16")});

        BigDecimal saldo = clienteService.calcularSaldoDevedor(CLIENTE_ID);

        assertEquals(new BigDecimal("5016"), saldo);
    }

    @Test
    @DisplayName("listarClientes: sem filtro de status exclui clientes inativos")
    void listarClientes_excluiInativosPorPadrao() {
        Cliente ativo = Cliente.builder()
                .clienteId(CLIENTE_ID)
                .codigo("C001")
                .nome("Empresa Ativa")
                .cpfCnpj("12345678000199")
                .statusCliente(StatusCliente.ATIVO)
                .saldoDevedor(BigDecimal.ZERO)
                .build();
        Page<Cliente> page = new PageImpl<>(List.of(ativo));
        when(clienteRepository.buscar(
                org.mockito.ArgumentMatchers.eq(null),
                org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.eq(true),
                org.mockito.ArgumentMatchers.eq(StatusCliente.INATIVO),
                org.mockito.ArgumentMatchers.eq(null),
                org.mockito.ArgumentMatchers.eq(null),
                org.mockito.ArgumentMatchers.eq(PageRequest.of(0, 20))))
                .thenReturn(page);
        when(dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(CLIENTE_ID)).thenReturn(List.of());

        Page<ClienteResponseDTO> result = clienteService.listarClientes(null, null, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals("C001", result.getContent().get(0).getCodigo());
        assertEquals(StatusCliente.ATIVO, result.getContent().get(0).getStatusCliente());
    }

    @Test
    @DisplayName("atualizarStatusCliente: cliente inexistente lança 404")
    void atualizarStatusCliente_naoEncontrado() {
        when(clienteRepository.findById(CLIENTE_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> clienteService.atualizarStatusCliente(CLIENTE_ID));
    }
}
