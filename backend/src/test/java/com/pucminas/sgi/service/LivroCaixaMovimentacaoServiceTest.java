package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.LivroCaixaMovimentacaoRequestDTO;
import com.pucminas.sgi.entity.LivroCaixaCategoria;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.mapper.LivroCaixaMovimentacaoMapper;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.LivroCaixaAnexoRepository;
import com.pucminas.sgi.repository.LivroCaixaHistoricoRepository;
import com.pucminas.sgi.repository.LivroCaixaMovimentacaoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LivroCaixaMovimentacaoServiceTest {

    @Mock LivroCaixaMovimentacaoRepository movimentacaoRepository;
    @Mock LivroCaixaHistoricoRepository historicoRepository;
    @Mock LivroCaixaAnexoRepository anexoRepository;
    @Mock LivroCaixaCategoriaService categoriaService;
    @Mock ContaFinanceiraService contaService;
    @Mock ClienteRepository clienteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock StaffAccessService staffAccessService;
    @Mock AuditoriaService auditoriaService;
    @Mock LivroCaixaMovimentacaoMapper movimentacaoMapper;

    private LivroCaixaMovimentacaoService service;

    @BeforeEach
    void setUp() {
        service = new LivroCaixaMovimentacaoService(
                movimentacaoRepository, historicoRepository, anexoRepository, categoriaService, contaService,
                clienteRepository, usuarioRepository, staffAccessService, auditoriaService, movimentacaoMapper,
                Clock.fixed(Instant.parse("2026-09-11T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void criarRejeitaCategoriaIncompativel() {
        UUID userId = UUID.randomUUID();
        UUID catId = UUID.randomUUID();
        when(categoriaService.requireAtiva(catId)).thenReturn(LivroCaixaCategoria.builder()
                .id(catId)
                .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                .build());
        LivroCaixaMovimentacaoRequestDTO dto = LivroCaixaMovimentacaoRequestDTO.builder()
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .status(LivroCaixaStatusMovimentacao.PREVISTO)
                .categoriaId(catId)
                .descricao("x")
                .valor(new BigDecimal("10.00"))
                .dataMovimentacao(LocalDate.of(2026, 9, 1))
                .build();

        assertThatThrownBy(() -> service.criar(userId, dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("incompatível");
    }

    @Test
    void detalharInexistenteLanca404() {
        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(movimentacaoRepository.findByIdDetalhado(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detalhar(userId, id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
