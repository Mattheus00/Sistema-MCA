package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.GeracaoCobrancaResultadoDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.ConfiguracaoCobranca;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.TipoCobranca;
import com.pucminas.sgi.repository.ConfiguracaoCobrancaRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GeracaoCobrancaRecorrenteService")
class GeracaoCobrancaRecorrenteServiceTest {

    @Mock
    private ConfiguracaoCobrancaRepository configuracaoRepository;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private HonorarioClienteService honorarioService;
    @Mock
    private AuditoriaService auditoriaService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private final Clock clock = Clock.fixed(Instant.parse("2026-02-01T09:00:00Z"), ZoneId.of("America/Sao_Paulo"));

    @Test
    @DisplayName("gera cobrança mensal com valor vigente e vencimento no último dia válido")
    void geraCobrancaMensal() {
        Cliente cliente = cliente();
        ConfiguracaoCobranca cfg = config(cliente, 31);
        HonorarioCliente honorario = honorario(cliente, "80000", LocalDate.of(2026, 1, 1));
        when(configuracaoRepository.findAtivasParaClientesComStatus(StatusCliente.ATIVO)).thenReturn(List.of(cfg));
        when(dividaRepository.existsByCliente_ClienteIdAndTipoCobrancaAndCompetencia(cliente.getClienteId(), TipoCobranca.HONORARIO_MENSAL, "2026-02"))
                .thenReturn(false);
        when(honorarioService.buscarVigente(cliente.getClienteId(), LocalDate.of(2026, 2, 1))).thenReturn(honorario);
        when(dividaRepository.saveAndFlush(any(Divida.class))).thenAnswer(inv -> {
            Divida d = inv.getArgument(0);
            d.setDividaId(UUID.randomUUID());
            return d;
        });

        GeracaoCobrancaRecorrenteService service = service();
        GeracaoCobrancaResultadoDTO resultado = service.gerarHonorariosMensais(YearMonth.of(2026, 2), true);

        ArgumentCaptor<Divida> captor = ArgumentCaptor.forClass(Divida.class);
        verify(dividaRepository).saveAndFlush(captor.capture());
        Divida divida = captor.getValue();
        assertEquals(new BigDecimal("80000"), divida.getValorOriginal());
        assertEquals(LocalDate.of(2026, 2, 28), divida.getVencimento());
        assertEquals(TipoCobranca.HONORARIO_MENSAL, divida.getTipoCobranca());
        assertEquals("2026-02", divida.getCompetencia());
        assertEquals(1, resultado.getCobrancasMensaisCriadas());
    }

    @Test
    @DisplayName("não duplica cobrança existente")
    void naoDuplica() {
        Cliente cliente = cliente();
        ConfiguracaoCobranca cfg = config(cliente, 10);
        when(configuracaoRepository.findAtivasParaClientesComStatus(StatusCliente.ATIVO)).thenReturn(List.of(cfg));
        when(dividaRepository.existsByCliente_ClienteIdAndTipoCobrancaAndCompetencia(cliente.getClienteId(), TipoCobranca.HONORARIO_MENSAL, "2026-01"))
                .thenReturn(true);

        GeracaoCobrancaResultadoDTO resultado = service().gerarHonorariosMensais(YearMonth.of(2026, 1), true);

        verify(dividaRepository, never()).saveAndFlush(any());
        assertEquals(1, resultado.getDuplicidadesIgnoradas());
        assertEquals(0, resultado.getCobrancasMensaisCriadas());
    }

    @Test
    @DisplayName("gera taxa de balanço separada em dezembro com mesmo valor do honorário")
    void geraTaxaBalanco() {
        Cliente cliente = cliente();
        ConfiguracaoCobranca cfg = config(cliente, 5);
        HonorarioCliente honorario = honorario(cliente, "90000", LocalDate.of(2026, 1, 1));
        when(configuracaoRepository.findTaxaBalancoAtivasParaClientesComStatus(StatusCliente.ATIVO)).thenReturn(List.of(cfg));
        when(dividaRepository.existsByCliente_ClienteIdAndTipoCobrancaAndCompetencia(cliente.getClienteId(), TipoCobranca.TAXA_BALANCO, "2026-12"))
                .thenReturn(false);
        when(honorarioService.buscarVigente(cliente.getClienteId(), LocalDate.of(2026, 12, 1))).thenReturn(honorario);
        when(dividaRepository.saveAndFlush(any(Divida.class))).thenAnswer(inv -> {
            Divida d = inv.getArgument(0);
            d.setDividaId(UUID.randomUUID());
            return d;
        });

        GeracaoCobrancaResultadoDTO resultado = service().gerarTaxasBalanco(2026, true);

        ArgumentCaptor<Divida> captor = ArgumentCaptor.forClass(Divida.class);
        verify(dividaRepository).saveAndFlush(captor.capture());
        assertEquals(TipoCobranca.TAXA_BALANCO, captor.getValue().getTipoCobranca());
        assertEquals("Taxa de Balanço - 2026", captor.getValue().getDescricao());
        assertEquals(new BigDecimal("90000"), captor.getValue().getValorDevedor());
        assertEquals(1, resultado.getTaxasBalancoCriadas());
    }

    private GeracaoCobrancaRecorrenteService service() {
        return new GeracaoCobrancaRecorrenteService(configuracaoRepository, dividaRepository, honorarioService,
                auditoriaService, eventPublisher, clock);
    }

    private Cliente cliente() {
        return Cliente.builder()
                .clienteId(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"))
                .nome("Cliente Teste")
                .cpfCnpj("123")
                .statusCliente(StatusCliente.ATIVO)
                .build();
    }

    private ConfiguracaoCobranca config(Cliente cliente, int diaVencimento) {
        return ConfiguracaoCobranca.builder()
                .configuracaoId(UUID.randomUUID())
                .cliente(cliente)
                .cobrancaRecorrenteAtiva(true)
                .taxaBalancoAtiva(true)
                .diaVencimento(diaVencimento)
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
