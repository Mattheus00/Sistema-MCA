package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.dto.response.ReciboDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PagamentoService")
class PagamentoServiceTest {

    @Mock
    private PagamentoRepository pagamentoRepository;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private DividaService dividaService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PagamentoService pagamentoService;

    private static final UUID DIVIDA_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CLIENTE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    @DisplayName("registrarPagamento: dívida inexistente lança 404")
    void registrar_dividaNaoEncontrada() {
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.empty());
        PagamentoDTO dto = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("1000"))
                .dataPagamento(LocalDate.now())
                .build();

        assertThrows(ResourceNotFoundException.class, () -> pagamentoService.registrarPagamento(dto));
    }

    @Test
    @DisplayName("registrarPagamento: valor maior que saldo lança regra de negócio")
    void registrar_valorMaiorQueDevedor() {
        Divida divida = dividaComSaldo(new BigDecimal("5000"));
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida));

        PagamentoDTO dto = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("6000"))
                .dataPagamento(LocalDate.now())
                .build();

        assertThrows(BusinessRuleException.class, () -> pagamentoService.registrarPagamento(dto));
    }

    @Test
    @DisplayName("registrarPagamento parcial: status PARCIAL e saldo atualizado")
    void registrar_pagamentoParcial() {
        Divida divida = dividaComSaldo(new BigDecimal("10000"));
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida));
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> {
            Pagamento p = inv.getArgument(0);
            p.setPagamentoId(UUID.randomUUID());
            return p;
        });

        PagamentoDTO dto = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("3000"))
                .dataPagamento(LocalDate.of(2026, 5, 1))
                .metodoPagamento("PIX")
                .build();

        ReciboDTO recibo = pagamentoService.registrarPagamento(dto);

        assertEquals(new BigDecimal("30.00"), recibo.getValorPago());
        assertEquals(StatusDivida.PARCIAL, divida.getStatusDivida());
        assertEquals(new BigDecimal("7000"), divida.getValorDevedor());
        verify(eventPublisher).publishEvent(any(ClienteStatusUpdateEvent.class));
    }

    @Test
    @DisplayName("registrarPagamento total: status QUITADA")
    void registrar_quitacaoTotal() {
        Divida divida = dividaComSaldo(new BigDecimal("2500"));
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida));
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

        PagamentoDTO dto = PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("2500"))
                .dataPagamento(LocalDate.now())
                .build();

        pagamentoService.registrarPagamento(dto);

        assertEquals(StatusDivida.QUITADA, divida.getStatusDivida());
        assertEquals(0, divida.getValorDevedor().compareTo(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("registrarPagamento publica evento de atualização do cliente")
    void registrar_publicaEventoCliente() {
        Divida divida = dividaComSaldo(new BigDecimal("1000"));
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida));
        when(pagamentoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        pagamentoService.registrarPagamento(PagamentoDTO.builder()
                .dividaId(DIVIDA_ID)
                .valorPago(new BigDecimal("1000"))
                .dataPagamento(LocalDate.now())
                .build());

        ArgumentCaptor<ClienteStatusUpdateEvent> captor = ArgumentCaptor.forClass(ClienteStatusUpdateEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertEquals(CLIENTE_ID, captor.getValue().clienteId());
    }

    private static Divida dividaComSaldo(BigDecimal saldoCentavos) {
        Cliente cliente = Cliente.builder()
                .clienteId(CLIENTE_ID)
                .nome("Cliente Teste")
                .cpfCnpj("12345678901")
                .build();
        return Divida.builder()
                .dividaId(DIVIDA_ID)
                .cliente(cliente)
                .protocolo("DIV-2026-001")
                .valorOriginal(saldoCentavos)
                .valorDevedor(saldoCentavos)
                .vencimento(LocalDate.now().plusDays(10))
                .statusDivida(StatusDivida.EM_ABERTO)
                .build();
    }
}
