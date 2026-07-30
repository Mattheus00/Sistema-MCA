package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ClienteIdentificacaoBoletoServiceTest {

    @Mock
    private ClienteRepository clienteRepository;

    @InjectMocks
    private ClienteIdentificacaoBoletoService service;

    private Cliente clienteA;
    private Cliente clienteB;

    @BeforeEach
    void setUp() {
        clienteA = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("COOPERATIVA AGROPECUARIA")
                .cpfCnpj("12345678000190")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        clienteB = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("COOPERATIVA AGRO")
                .cpfCnpj("98765432000111")
                .statusCliente(StatusCliente.ATIVO)
                .build();
    }

    @Test
    @DisplayName("Identifica por CNPJ no nome do arquivo")
    void identificaPorCnpj() {
        var r = service.identificar("boleto_12345678000190.pdf", List.of(clienteA, clienteB));
        assertEquals(ConfiancaIdentificacaoBoleto.ALTA, r.confianca());
        assertEquals(MetodoIdentificacaoBoleto.CPF_CNPJ, r.metodo());
        assertEquals(clienteA.getClienteId(), r.cliente().getClienteId());
    }

    @Test
    @DisplayName("Nome exato único")
    void nomeExato() {
        var r = service.identificar("cooperativa_agropecuaria.pdf", List.of(clienteA, clienteB));
        assertEquals(ConfiancaIdentificacaoBoleto.ALTA, r.confianca());
        assertEquals(MetodoIdentificacaoBoleto.NOME_EXATO, r.metodo());
    }

    @Test
    @DisplayName("Ambiguidade retorna baixa confiança")
    void ambiguidade() {
        Cliente a = Cliente.builder().clienteId(UUID.randomUUID()).nome("EMPRESA ABC LTDA")
                .cpfCnpj("11111111111").statusCliente(StatusCliente.ATIVO).build();
        Cliente b = Cliente.builder().clienteId(UUID.randomUUID()).nome("EMPRESA ABC ME")
                .cpfCnpj("22222222222").statusCliente(StatusCliente.ATIVO).build();
        var r = service.identificar("empresa_abc.pdf", List.of(a, b));
        assertEquals(ConfiancaIdentificacaoBoleto.BAIXA, r.confianca());
        assertNull(r.cliente());
    }

    @Test
    @DisplayName("Nome parcial sem sufixo societário")
    void nomeParcialSemSufixo() {
        Cliente edmilson = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("EDMILSON DE OLIVEIRA TOMAZ E CIA LTDA")
                .cpfCnpj("03591272000100")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        Cliente oliveira = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("SILVALEITE APARECIDO DE OLIVEIRA")
                .cpfCnpj("11111111111")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        var r = service.identificar("EDMILSON DE OLIVEIRA TOMAZ.pdf", List.of(edmilson, oliveira));
        assertEquals(ConfiancaIdentificacaoBoleto.MEDIA, r.confianca());
        assertEquals(edmilson.getClienteId(), r.cliente().getClienteId());
    }

    @Test
    @DisplayName("Identifica por código numérico no arquivo")
    void identificaPorCodigo() {
        Cliente c = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .codigo("14")
                .nome("EDMILSON DE OLIVEIRA TOMAZ E CIA LTDA")
                .cpfCnpj("03591272000100")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        var r = service.identificar("14.pdf", List.of(c));
        assertEquals(ConfiancaIdentificacaoBoleto.ALTA, r.confianca());
        assertEquals(MetodoIdentificacaoBoleto.CODIGO_CLIENTE, r.metodo());
        assertEquals(c.getClienteId(), r.cliente().getClienteId());
    }

    @Test
    @DisplayName("Identifica por código seguido do nome no arquivo")
    void identificaPorCodigoComNome() {
        Cliente c = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .codigo("4")
                .nome("ANA CLAUDIA DE CARVALHO BOTELHO")
                .cpfCnpj("12345678901")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        var r = service.identificar("4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf", List.of(c));
        assertEquals(ConfiancaIdentificacaoBoleto.ALTA, r.confianca());
        assertEquals(MetodoIdentificacaoBoleto.CODIGO_CLIENTE, r.metodo());
        assertEquals(c.getClienteId(), r.cliente().getClienteId());
    }

    @Test
    @DisplayName("Não identificado")
    void naoIdentificado() {
        var r = service.identificar("xyz_sem_match.pdf", List.of(clienteA));
        assertEquals(ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO, r.confianca());
    }
}
