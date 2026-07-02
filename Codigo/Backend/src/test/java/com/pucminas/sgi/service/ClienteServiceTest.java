package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
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

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
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
        when(clienteRepository.findById(CLIENTE_ID)).thenReturn(Optional.of(cliente));
        when(dividaRepository.sumValorDevedorByClienteId(eq(CLIENTE_ID), eq(StatusDivida.emAberto())))
                .thenReturn(new BigDecimal("15000"));

        clienteService.atualizarStatusCliente(CLIENTE_ID);

        assertEquals(new BigDecimal("15000"), cliente.getSaldoDevedor());
        assertEquals(StatusCliente.INATIVO, cliente.getStatusCliente());
        verify(clienteRepository).save(cliente);
    }

    @Test
    @DisplayName("calcularSaldoDevedor usa status em aberto")
    void calcularSaldoDevedor() {
        when(dividaRepository.sumValorDevedorByClienteId(CLIENTE_ID, StatusDivida.emAberto()))
                .thenReturn(new BigDecimal("5000"));

        BigDecimal saldo = clienteService.calcularSaldoDevedor(CLIENTE_ID);

        assertEquals(new BigDecimal("5000"), saldo);
    }

    @Test
    @DisplayName("atualizarStatusCliente: cliente inexistente lança 404")
    void atualizarStatusCliente_naoEncontrado() {
        when(clienteRepository.findById(CLIENTE_ID)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> clienteService.atualizarStatusCliente(CLIENTE_ID));
    }
}
