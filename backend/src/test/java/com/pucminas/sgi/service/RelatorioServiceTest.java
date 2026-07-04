package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.RelatorioInadimplentesDTO;
import com.pucminas.sgi.dto.response.ResumoRelatorioDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ExportacaoRelatorioException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.NotificacaoEmailRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RelatorioService")
class RelatorioServiceTest {

    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private PagamentoRepository pagamentoRepository;
    @Mock
    private NotificacaoEmailRepository notificacaoEmailRepository;
    @Mock
    private DividaService dividaService;

    @InjectMocks
    private RelatorioService relatorioService;

    @Test
    @DisplayName("gerarRelatorioInadimplentes usa status em aberto por padrão")
    void gerarRelatorioInadimplentes_padraoEmAberto() {
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Devedor")
                .cpfCnpj("123")
                .build();
        Divida divida = Divida.builder()
                .dividaId(UUID.randomUUID())
                .cliente(cliente)
                .valorDevedor(new BigDecimal("5000"))
                .valorOriginal(new BigDecimal("5000"))
                .vencimento(LocalDate.of(2026, 3, 1))
                .statusDivida(StatusDivida.VENCIDA)
                .protocolo("DIV-1")
                .build();
        when(dividaRepository.findByStatusDividaIn(StatusDivida.emAberto())).thenReturn(List.of(divida));

        RelatorioInadimplentesDTO rel = relatorioService.gerarRelatorioInadimplentes(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), null);

        assertEquals(1, rel.getTotalClientesInadimplentes());
        assertEquals(new BigDecimal("50.00"), rel.getValorTotalInadimplente());
        assertEquals(1, rel.getItens().size());
    }

    @Test
    @DisplayName("gerarResumo agrega dívidas em aberto e pagamentos")
    void gerarResumo() {
        Cliente cliente = Cliente.builder().clienteId(UUID.randomUUID()).nome("C").cpfCnpj("1").build();
        Divida divida = Divida.builder()
                .dividaId(UUID.randomUUID())
                .cliente(cliente)
                .valorDevedor(new BigDecimal("10000"))
                .valorOriginal(new BigDecimal("10000"))
                .vencimento(LocalDate.now())
                .statusDivida(StatusDivida.EM_ABERTO)
                .protocolo("DIV-X")
                .build();
        when(clienteRepository.count()).thenReturn(5L);
        when(dividaRepository.findAll()).thenReturn(List.of(divida));
        when(dividaService.getValorEJurosReais(divida)).thenReturn(new BigDecimal[]{new BigDecimal("100.00"), BigDecimal.ZERO});
        when(pagamentoRepository.findAll()).thenReturn(Collections.emptyList());

        ResumoRelatorioDTO resumo = relatorioService.gerarResumo(null);

        assertNotNull(resumo);
        assertEquals(5, resumo.getTotalClientes());
        assertEquals(1, resumo.getTotalDividas());
        assertEquals(0, new BigDecimal("100.00").compareTo(resumo.getTotalEmAberto()));
    }

    @Test
    @DisplayName("exportarRelatorioPDF retorna recurso não vazio")
    void exportarPdf() throws Exception {
        Resource resource = relatorioService.exportarRelatorioPDF(
                "inadimplentes", LocalDate.now().minusMonths(1), LocalDate.now());
        assertNotNull(resource);
        assertTrue(resource.contentLength() > 0);
    }

    @Test
    @DisplayName("exportarRelatorioExcel retorna recurso não vazio")
    void exportarExcel() throws Exception {
        Resource resource = relatorioService.exportarRelatorioExcel(
                "inadimplentes", LocalDate.now().minusMonths(1), LocalDate.now());
        assertNotNull(resource);
        assertTrue(resource.contentLength() > 0);
    }
}
