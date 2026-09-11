package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientesImportacaoExternaTest {

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private DividaRepository dividaRepository;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @TempDir
    Path diretorioTemporario;

    private ClientesEmailImportRunner emails;
    private ClientesRelatorioImportRunner relatorio;

    @BeforeEach
    void criarImportadores() {
        emails = new ClientesEmailImportRunner(clienteRepository);
        relatorio = new ClientesRelatorioImportRunner(clienteRepository);
    }

    @Test
    void importadoresPermanecemDesativadosPorPadrao() {
        executarImportadores();

        verifyNoInteractions(clienteRepository, dividaRepository, pagamentoRepository);
    }

    @Test
    void beansDeImportacaoNaoSobemSemFlag() {
        org.springframework.boot.test.context.runner.ApplicationContextRunner runner =
                new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                        .withUserConfiguration(ClientesRelatorioImportRunner.class, ClientesEmailImportRunner.class,
                                ServicosImportRunner.class, ClientesImportRunner.class)
                        .withBean(ClienteRepository.class, () -> clienteRepository)
                        .withBean(com.pucminas.sgi.repository.ServicoRepository.class,
                                () -> org.mockito.Mockito.mock(com.pucminas.sgi.repository.ServicoRepository.class));

        runner.withPropertyValues("sgi.import.enabled=false")
                .run(ctx -> org.assertj.core.api.Assertions.assertThat(ctx)
                        .doesNotHaveBean(ClientesRelatorioImportRunner.class)
                        .doesNotHaveBean(ClientesEmailImportRunner.class)
                        .doesNotHaveBean(ServicosImportRunner.class)
                        .doesNotHaveBean(ClientesImportRunner.class));
        runner.withPropertyValues("sgi.import.enabled=true")
                .run(ctx -> org.assertj.core.api.Assertions.assertThat(ctx)
                        .hasSingleBean(ClientesRelatorioImportRunner.class)
                        .hasSingleBean(ClientesEmailImportRunner.class)
                        .hasSingleBean(ServicosImportRunner.class)
                        .hasSingleBean(ClientesImportRunner.class));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n"})
    void diretorioNaoConfiguradoNaoAcessaRepositorios(String diretorio) {
        configurarDiretorio(diretorio);

        executarImportadores();

        verifyNoInteractions(clienteRepository, dividaRepository, pagamentoRepository);
    }

    @Test
    void diretorioInexistenteNaoAcessaRepositorios() {
        configurarDiretorio(diretorioTemporario.resolve("inexistente").toString());

        executarImportadores();

        verifyNoInteractions(clienteRepository, dividaRepository, pagamentoRepository);
    }

    @Test
    void arquivosAusentesNaoAcessamRepositorios() {
        configurarDiretorio(diretorioTemporario.toString());

        executarImportadores();

        verifyNoInteractions(clienteRepository, dividaRepository, pagamentoRepository);
    }

    @Test
    void diretoriosComNomesDosArquivosNaoSaoImportados() throws Exception {
        configurarDiretorio(diretorioTemporario.toString());
        Files.createDirectory(diretorioTemporario.resolve("clientes-emails.csv"));
        Files.createDirectory(diretorioTemporario.resolve("clientes-relatorio.csv"));

        executarImportadores();

        verifyNoInteractions(clienteRepository, dividaRepository, pagamentoRepository);
    }

    @Test
    void atualizaEmailAPartirDoDiretorioConfiguradoSemRegravarEmailIgual() throws Exception {
        configurarDiretorio(diretorioTemporario.toString());
        Files.writeString(diretorioTemporario.resolve("clientes-emails.csv"),
                "NOME DA EMPRESA;E-MAIL\nCOMERCIAL JPC;contato@example.com\n", StandardCharsets.UTF_8);
        Cliente cliente = Cliente.builder().nome("Empresa sintetica de teste").email("anterior@example.com").build();
        when(clienteRepository.findByNomeContainingIgnoreCase("COMERCIAL JPC", Pageable.unpaged()))
                .thenReturn(new PageImpl<>(List.of(cliente)));

        emails.run();
        emails.run();

        assertThat(cliente.getEmail()).isEqualTo("contato@example.com");
        assertThat(cliente.getAtualizadoEm()).isNotNull();
        verify(clienteRepository).save(cliente);
        verifyNoInteractions(dividaRepository, pagamentoRepository);
    }

    @Test
    void importaRelatorioExternoSinteticoENaoReinsereCodigoExistente() throws Exception {
        configurarDiretorio(diretorioTemporario.toString());
        String csv = "codigo,nome,celular,email,cpf_cnpj\n"
                + "teste-001,Empresa sintetica de teste,,contato@example.com,12345678901\n";
        Files.writeString(diretorioTemporario.resolve("clientes-relatorio.csv"), csv, StandardCharsets.UTF_8);
        when(clienteRepository.findByCodigo("TESTE-001")).thenReturn(Optional.empty());

        relatorio.run();

        ArgumentCaptor<Cliente> captor = ArgumentCaptor.forClass(Cliente.class);
        verify(clienteRepository).save(captor.capture());
        Cliente cliente = captor.getValue();
        assertThat(cliente.getCodigo()).isEqualTo("TESTE-001");
        assertThat(cliente.getNome()).isEqualTo("Empresa sintetica de teste");
        assertThat(cliente.getEmail()).isEqualTo("contato@example.com");
        assertThat(cliente.getStatusCliente()).isEqualTo(StatusCliente.ATIVO);

        clearInvocations(clienteRepository, dividaRepository, pagamentoRepository);
        when(clienteRepository.findByCodigo("TESTE-001"))
                .thenReturn(Optional.of(Cliente.builder().codigo("TESTE-001").build()));
        relatorio.run();

        verify(clienteRepository).findByCodigo("TESTE-001");
        verifyNoMoreInteractions(clienteRepository);
        verifyNoInteractions(dividaRepository, pagamentoRepository);
    }

    @Test
    void naoApagaClientesExistentesAoImportarCodigoJaCadastrado() throws Exception {
        configurarDiretorio(diretorioTemporario.toString());
        String csv = "codigo,nome,celular,email,cpf_cnpj\n"
                + "teste-002,Outra empresa sintetica,,teste@example.com,12345678901\n";
        Files.writeString(diretorioTemporario.resolve("clientes-relatorio.csv"), csv, StandardCharsets.UTF_8);
        when(clienteRepository.findByCodigo("TESTE-002"))
                .thenReturn(Optional.of(Cliente.builder().codigo("TESTE-002").build()));

        relatorio.run();

        verify(clienteRepository).findByCodigo("TESTE-002");
        verifyNoMoreInteractions(clienteRepository);
        verifyNoInteractions(dividaRepository, pagamentoRepository);
    }

    private void configurarDiretorio(String diretorio) {
        ReflectionTestUtils.setField(emails, "clientesDir", diretorio);
        ReflectionTestUtils.setField(relatorio, "clientesDir", diretorio);
    }

    private void executarImportadores() {
        emails.run();
        relatorio.run();
    }
}
