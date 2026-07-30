package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.HonorarioClienteDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.HonorarioClienteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HonorarioClienteService")
class HonorarioClienteServiceTest {

    @Mock
    private HonorarioClienteRepository honorarioRepository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private AuditoriaService auditoriaService;

    @Test
    @DisplayName("novo valor encerra vigência anterior no dia anterior")
    void encerraVigenciaAnterior() {
        Cliente cliente = cliente(StatusCliente.ATIVO);
        HonorarioCliente atual = honorario(cliente, "80000", LocalDate.of(2026, 1, 1));
        when(clienteRepository.findById(cliente.getClienteId())).thenReturn(Optional.of(cliente));
        when(honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), LocalDate.of(2027, 1, 1))).thenReturn(List.of());
        when(honorarioRepository.findVigenteNaData(cliente.getClienteId(), LocalDate.of(2027, 1, 1))).thenReturn(Optional.of(atual));
        when(honorarioRepository.save(any(HonorarioCliente.class))).thenAnswer(inv -> inv.getArgument(0));

        service().cadastrarNovoValor(cliente.getClienteId(), HonorarioClienteDTO.builder()
                .valor(new BigDecimal("864.00"))
                .dataInicioVigencia(LocalDate.of(2027, 1, 1))
                .observacao("Novo valor")
                .build());

        assertEquals(LocalDate.of(2026, 12, 31), atual.getDataFimVigencia());
        ArgumentCaptor<HonorarioCliente> captor = ArgumentCaptor.forClass(HonorarioCliente.class);
        verify(honorarioRepository, times(2)).save(captor.capture());
        assertEquals(new BigDecimal("86400"), captor.getAllValues().get(1).getValor());
    }

    @Test
    @DisplayName("valor zero é inválido")
    void valorZeroInvalido() {
        Cliente cliente = cliente(StatusCliente.ATIVO);
        when(clienteRepository.findById(cliente.getClienteId())).thenReturn(Optional.of(cliente));
        assertThrows(BusinessRuleException.class, () -> service().cadastrarNovoValor(cliente.getClienteId(),
                HonorarioClienteDTO.builder().valor(BigDecimal.ZERO).dataInicioVigencia(LocalDate.now()).build()));
    }

    @Test
    @DisplayName("cliente inativo não recebe honorário")
    void clienteInativo() {
        Cliente cliente = cliente(StatusCliente.INATIVO);
        when(clienteRepository.findById(cliente.getClienteId())).thenReturn(Optional.of(cliente));
        assertThrows(BusinessRuleException.class, () -> service().cadastrarNovoValor(cliente.getClienteId(),
                HonorarioClienteDTO.builder().valor(new BigDecimal("100.00")).dataInicioVigencia(LocalDate.now()).build()));
    }

    private HonorarioClienteService service() {
        return new HonorarioClienteService(honorarioRepository, clienteRepository, auditoriaService);
    }

    private Cliente cliente(StatusCliente status) {
        return Cliente.builder()
                .clienteId(UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"))
                .nome("Cliente")
                .cpfCnpj("1")
                .statusCliente(status)
                .build();
    }

    private HonorarioCliente honorario(Cliente cliente, String valorCentavos, LocalDate inicio) {
        return HonorarioCliente.builder()
                .honorarioId(UUID.randomUUID())
                .cliente(cliente)
                .valor(new BigDecimal(valorCentavos))
                .dataInicioVigencia(inicio)
                .ativo(true)
                .build();
    }
}
