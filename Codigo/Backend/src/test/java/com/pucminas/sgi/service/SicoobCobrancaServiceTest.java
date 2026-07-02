package com.pucminas.sgi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.dto.response.CobrancaSicoobResponseDTO;
import com.pucminas.sgi.dto.response.SicoobStatusResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.CobrancaSicoob;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.enums.TipoCobrancaSicoob;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.integration.sicoob.SicoobBoletoClient;
import com.pucminas.sgi.integration.sicoob.SicoobPixClient;
import com.pucminas.sgi.repository.CobrancaSicoobRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SicoobCobrancaService")
class SicoobCobrancaServiceTest {

    @Mock
    private SicoobProperties properties;
    @Mock
    private DividaRepository dividaRepository;
    @Mock
    private CobrancaSicoobRepository cobrancaRepository;
    @Mock
    private SicoobPixClient pixClient;
    @Mock
    private SicoobBoletoClient boletoClient;

    @InjectMocks
    private SicoobCobrancaService sicoobCobrancaService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final UUID DIVIDA_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @BeforeEach
    void habilitarIntegracao() {
        lenient().when(properties.isEnabled()).thenReturn(true);
        lenient().when(properties.isMock()).thenReturn(true);
        lenient().when(properties.isConfiguredForApi()).thenReturn(false);
    }

    @Test
    @DisplayName("status retorna enabled e mock")
    void status() {
        SicoobStatusResponseDTO dto = sicoobCobrancaService.status();
        assertTrue(dto.isEnabled());
        assertTrue(dto.isMock());
        assertNotNull(dto.getMensagem());
    }

    @Test
    @DisplayName("emitirPix: integração desabilitada lança exceção")
    void emitirPix_desabilitado() {
        when(properties.isEnabled()).thenReturn(false);

        assertThrows(BusinessRuleException.class, () -> sicoobCobrancaService.emitirPix(DIVIDA_ID));
    }

    @Test
    @DisplayName("emitirPix: dívida sem saldo lança exceção")
    void emitirPix_semSaldo() {
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida(BigDecimal.ZERO)));

        assertThrows(BusinessRuleException.class, () -> sicoobCobrancaService.emitirPix(DIVIDA_ID));
    }

    @Test
    @DisplayName("emitirPix: persiste cobrança pendente com dados do mock")
    void emitirPix_sucesso() throws Exception {
        Divida divida = divida(new BigDecimal("10000"));
        when(dividaRepository.findById(DIVIDA_ID)).thenReturn(Optional.of(divida));

        ObjectNode respostaPix = objectMapper.createObjectNode();
        respostaPix.put("pixCopiaECola", "000201MOCK");
        respostaPix.put("location", "https://mock.sicoob/pix");
        when(pixClient.criarCobrancaImediata(any(Divida.class), anyString())).thenReturn(respostaPix);
        when(cobrancaRepository.save(any(CobrancaSicoob.class))).thenAnswer(inv -> {
            CobrancaSicoob c = inv.getArgument(0);
            if (c.getCobrancaId() == null) {
                c.setCobrancaId(UUID.randomUUID());
            }
            return c;
        });

        CobrancaSicoobResponseDTO dto = sicoobCobrancaService.emitirPix(DIVIDA_ID);

        assertEquals(TipoCobrancaSicoob.PIX, dto.getTipo());
        assertEquals(StatusCobrancaSicoob.PENDENTE, dto.getStatus());
        assertEquals("000201MOCK", dto.getPixCopiaECola());
        assertEquals(new BigDecimal("10000"), dto.getValorCentavos());
    }

    @Test
    @DisplayName("consultar: cobrança inexistente lança 404")
    void consultar_naoEncontrada() {
        UUID cobrancaId = UUID.randomUUID();
        when(cobrancaRepository.findById(cobrancaId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> sicoobCobrancaService.consultar(cobrancaId));
    }

    private static Divida divida(BigDecimal saldoCentavos) {
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cliente Sicoob")
                .cpfCnpj("12345678901")
                .build();
        return Divida.builder()
                .dividaId(DIVIDA_ID)
                .cliente(cliente)
                .protocolo("PROT-001")
                .valorOriginal(saldoCentavos)
                .valorDevedor(saldoCentavos)
                .vencimento(LocalDate.now().plusDays(15))
                .statusDivida(StatusDivida.EM_ABERTO)
                .build();
    }
}
