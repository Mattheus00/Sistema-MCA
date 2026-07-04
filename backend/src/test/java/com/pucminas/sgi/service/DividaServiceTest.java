package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import com.pucminas.sgi.repository.ServicoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DividaService")
class DividaServiceTest {

    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private PagamentoRepository pagamentoRepository;
    @Mock
    private ServicoRepository servicoRepository;

    @InjectMocks
    private DividaService dividaService;

    private static final UUID DIVIDA_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");

    @Test
    @DisplayName("consultarDivida: inexistente lança 404")
    void consultar_naoEncontrada() {
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> dividaService.consultarDivida(DIVIDA_ID));
    }

    @Test
    @DisplayName("verificarDividasVencidas marca EM_ABERTO vencida como VENCIDA")
    void verificarDividasVencidas() {
        Divida divida = Divida.builder()
                .dividaId(DIVIDA_ID)
                .cliente(Cliente.builder().clienteId(UUID.randomUUID()).nome("C").cpfCnpj("1").build())
                .protocolo("DIV-OLD")
                .valorOriginal(new BigDecimal("1000"))
                .valorDevedor(new BigDecimal("1000"))
                .vencimento(LocalDate.now().minusDays(5))
                .statusDivida(StatusDivida.EM_ABERTO)
                .build();
        when(dividaRepository.findByStatusDividaIn(List.of(StatusDivida.EM_ABERTO))).thenReturn(List.of(divida));

        dividaService.verificarDividasVencidas();

        assertEquals(StatusDivida.VENCIDA, divida.getStatusDivida());
        verify(dividaRepository).save(divida);
    }
}
