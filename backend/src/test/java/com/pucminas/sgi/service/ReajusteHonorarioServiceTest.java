package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ReajusteHonorarioRequestDTO;
import com.pucminas.sgi.dto.response.ReajusteHonorarioResumoDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.HonorarioClienteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
@DisplayName("ReajusteHonorarioService")
class ReajusteHonorarioServiceTest {

    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private HonorarioClienteRepository honorarioRepository;
    @Mock
    private HonorarioClienteService honorarioService;
    @Mock
    private AuditoriaService auditoriaService;

    @Test
    @DisplayName("simulação calcula novo valor sem persistir")
    void simulaSemPersistir() {
        Cliente cliente = cliente(StatusCliente.ATIVO);
        HonorarioCliente vigente = honorario(cliente, "80000", LocalDate.of(2026, 1, 1));
        ReajusteHonorarioRequestDTO req = request();
        when(clienteRepository.findAllById(req.getClienteIds())).thenReturn(List.of(cliente));
        when(honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), req.getDataInicioVigencia())).thenReturn(List.of());
        when(honorarioRepository.findVigenteNaData(cliente.getClienteId(), LocalDate.of(2026, 12, 31))).thenReturn(Optional.of(vigente));

        ReajusteHonorarioResumoDTO resumo = service().simular(req);

        assertEquals(1, resumo.getClientesProcessados());
        assertEquals(0, resumo.getReajustesAplicados());
        assertEquals(new BigDecimal("864.00"), resumo.getDetalhes().get(0).getNovoValor());
        verify(honorarioService, never()).criarNovoHonorario(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("aplicação encerra vigência anterior via criação do novo honorário")
    void aplicaReajuste() {
        Cliente cliente = cliente(StatusCliente.ATIVO);
        HonorarioCliente vigente = honorario(cliente, "80000", LocalDate.of(2026, 1, 1));
        ReajusteHonorarioRequestDTO req = request();
        when(clienteRepository.findAllById(req.getClienteIds())).thenReturn(List.of(cliente));
        when(honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), req.getDataInicioVigencia())).thenReturn(List.of());
        when(honorarioRepository.findVigenteNaData(cliente.getClienteId(), LocalDate.of(2026, 12, 31))).thenReturn(Optional.of(vigente));
        when(honorarioService.criarNovoHonorario(eq(cliente), eq(new BigDecimal("86400")), eq(req.getDataInicioVigencia()),
                eq(req.getPercentualReajuste()), eq(req.getObservacao()), any()))
                .thenReturn(honorario(cliente, "86400", req.getDataInicioVigencia()));

        ReajusteHonorarioResumoDTO resumo = service().aplicar(req);

        assertEquals(1, resumo.getReajustesAplicados());
        verify(auditoriaService).registrar(eq("REAJUSTE_HONORARIO_LOTE"), eq("HonorarioCliente"), any(), contains("aplicados=1"));
    }

    @Test
    @DisplayName("cliente com vigência futura retorna impedimento")
    void futuroImpede() {
        Cliente cliente = cliente(StatusCliente.ATIVO);
        ReajusteHonorarioRequestDTO req = request();
        when(clienteRepository.findAllById(req.getClienteIds())).thenReturn(List.of(cliente));
        when(honorarioRepository.findFuturosApartirDe(cliente.getClienteId(), req.getDataInicioVigencia()))
                .thenReturn(List.of(honorario(cliente, "90000", req.getDataInicioVigencia())));

        ReajusteHonorarioResumoDTO resumo = service().simular(req);

        assertEquals(1, resumo.getErros());
        assertEquals(false, resumo.getDetalhes().get(0).getElegivel());
    }

    @Test
    @DisplayName("percentual zero é inválido")
    void percentualInvalido() {
        ReajusteHonorarioRequestDTO req = request();
        req.setPercentualReajuste(BigDecimal.ZERO);
        assertThrows(BusinessRuleException.class, () -> service().simular(req));
    }

    private ReajusteHonorarioService service() {
        return new ReajusteHonorarioService(clienteRepository, honorarioRepository, honorarioService, auditoriaService);
    }

    private ReajusteHonorarioRequestDTO request() {
        return ReajusteHonorarioRequestDTO.builder()
                .percentualReajuste(new BigDecimal("8"))
                .dataInicioVigencia(LocalDate.of(2027, 1, 1))
                .observacao("Reajuste anual")
                .clienteIds(List.of(UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")))
                .aplicarTodos(false)
                .build();
    }

    private Cliente cliente(StatusCliente status) {
        return Cliente.builder()
                .clienteId(UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
                .nome("Cliente Reajuste")
                .cpfCnpj("123")
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
