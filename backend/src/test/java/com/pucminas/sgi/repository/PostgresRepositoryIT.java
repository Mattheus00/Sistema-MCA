package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.DocumentoCliente;
import com.pucminas.sgi.entity.LivroCaixaCategoria;
import com.pucminas.sgi.entity.LivroCaixaMovimentacao;
import com.pucminas.sgi.entity.Tarefa;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.LivroCaixaOrigemMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaStatusMovimentacao;
import com.pucminas.sgi.enums.LivroCaixaTipoMovimentacao;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.PrioridadeTarefa;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusDocumentoCliente;
import com.pucminas.sgi.enums.StatusTarefa;
import com.pucminas.sgi.enums.TipoDocumentoCliente;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercita repositórios e Specifications no PostgreSQL.
 * Desligado por padrão. Ative com {@code -Dsgi.testcontainers=true} e Docker disponível.
 */
@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=false",
        "spring.jpa.show-sql=false"
})
@Testcontainers(disabledWithoutDocker = true)
@EnabledIfSystemProperty(named = "sgi.testcontainers", matches = "true")
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PostgresRepositoryIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("sgi")
            .withUsername("sgi")
            .withPassword("sgi");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private TestEntityManager em;
    @Autowired
    private ClienteRepository clienteRepository;
    @Autowired
    private LivroCaixaMovimentacaoRepository movimentacaoRepository;
    @Autowired
    private TarefaRepository tarefaRepository;
    @Autowired
    private DocumentoClienteRepository documentoClienteRepository;

    @Test
    @DisplayName("ClienteSpecs.buscar ignora inativos e casa nome, código e dígitos de CPF")
    void clienteSpecsBuscar() {
        persistirCliente("C001", "Empresa Alfa", "12345678000199", StatusCliente.ATIVO);
        persistirCliente("C002", "Empresa Beta", "00000000000000", StatusCliente.INATIVO);
        persistirCliente("C003", "Outro Cliente", "11111111111111", StatusCliente.ATIVO);
        em.flush();
        em.clear();

        assertThat(clienteRepository.findAll(ClienteSpecs.buscar(null, null)))
                .extracting(Cliente::getCodigo)
                .containsExactlyInAnyOrder("C001", "C003");
        assertThat(clienteRepository.findAll(ClienteSpecs.buscar("alfa", null)))
                .extracting(Cliente::getCodigo)
                .containsExactly("C001");
        assertThat(clienteRepository.findAll(ClienteSpecs.buscar("C003", null)))
                .extracting(Cliente::getCodigo)
                .containsExactly("C003");
        assertThat(clienteRepository.findAll(ClienteSpecs.buscar("12345678", null)))
                .extracting(Cliente::getCodigo)
                .containsExactly("C001");
        assertThat(clienteRepository.findAll(ClienteSpecs.buscar(null, StatusCliente.INATIVO)))
                .extracting(Cliente::getCodigo)
                .containsExactly("C002");
    }

    @Test
    @DisplayName("somarNoPeriodoPorDataEfetiva usa COALESCE(dataPagamento, dataMovimentacao)")
    void somarNoPeriodoPorDataEfetiva() {
        LivroCaixaCategoria categoria = em.persistAndFlush(LivroCaixaCategoria.builder()
                .nome("Honorários")
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .ativo(true)
                .build());
        persistirMovimentacao(categoria, new BigDecimal("1000"),
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 10),
                LivroCaixaStatusMovimentacao.RECEBIDO);
        persistirMovimentacao(categoria, new BigDecimal("400"),
                LocalDate.of(2026, 9, 15), null,
                LivroCaixaStatusMovimentacao.PREVISTO);
        persistirMovimentacao(categoria, new BigDecimal("999"),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2),
                LivroCaixaStatusMovimentacao.RECEBIDO);
        em.flush();
        em.clear();

        BigDecimal soma = movimentacaoRepository.somarNoPeriodoPorDataEfetiva(
                LivroCaixaTipoMovimentacao.ENTRADA,
                List.of(LivroCaixaStatusMovimentacao.RECEBIDO, LivroCaixaStatusMovimentacao.PREVISTO),
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30));
        assertThat(soma).isEqualByComparingTo(new BigDecimal("1400"));
    }

    @Test
    @DisplayName("LivroCaixaMovimentacaoSpecs filtra por tipo")
    void livroCaixaSpecs() {
        LivroCaixaCategoria entrada = em.persistAndFlush(LivroCaixaCategoria.builder()
                .nome("Entrada")
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .ativo(true)
                .build());
        LivroCaixaCategoria saida = em.persistAndFlush(LivroCaixaCategoria.builder()
                .nome("Saída")
                .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                .ativo(true)
                .build());
        persistirMovimentacao(entrada, BigDecimal.TEN, LocalDate.of(2026, 9, 1), null,
                LivroCaixaStatusMovimentacao.PREVISTO);
        em.persist(LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.SAIDA)
                .descricao("Aluguel")
                .valorCentavos(new BigDecimal("50"))
                .categoria(saida)
                .dataMovimentacao(LocalDate.of(2026, 9, 2))
                .status(LivroCaixaStatusMovimentacao.PREVISTO)
                .origem(LivroCaixaOrigemMovimentacao.MANUAL)
                .criadoPor("teste")
                .build());
        em.flush();
        em.clear();

        assertThat(movimentacaoRepository.findAll(
                LivroCaixaMovimentacaoSpecs.filtrar(
                        LivroCaixaTipoMovimentacao.ENTRADA, null, null, null, null, null,
                        null, null, null, null, null),
                PageRequest.of(0, 10)).getContent())
                .hasSize(1)
                .allMatch(m -> m.getTipo() == LivroCaixaTipoMovimentacao.ENTRADA);
    }

    @Test
    @DisplayName("TarefaRepository indicadores e TarefaSpecs")
    void tarefaIndicadoresESpecs() {
        Usuario responsavel = persistirUsuario("31988880001", "Ana");
        Usuario outro = persistirUsuario("31988880002", "Bruno");
        Tarefa atrasada = em.persist(Tarefa.builder()
                .titulo("Declarar IR")
                .status(StatusTarefa.A_FAZER)
                .prioridade(PrioridadeTarefa.ALTA)
                .responsavel(responsavel)
                .criadoPor(responsavel)
                .dataVencimento(LocalDate.now().minusDays(2))
                .categoria("Fiscal")
                .ordemKanban(0)
                .build());
        em.persist(Tarefa.builder()
                .titulo("Reunião")
                .status(StatusTarefa.CONCLUIDO)
                .prioridade(PrioridadeTarefa.BAIXA)
                .responsavel(outro)
                .criadoPor(responsavel)
                .dataVencimento(LocalDate.now().minusDays(1))
                .concluidoEm(LocalDateTime.now().minusHours(1))
                .ordemKanban(0)
                .build());
        em.flush();
        em.clear();

        List<StatusTarefa> abertas = List.of(
                StatusTarefa.BACKLOG, StatusTarefa.A_FAZER, StatusTarefa.EM_ANDAMENTO, StatusTarefa.EM_REVISAO);
        assertThat(tarefaRepository.countByStatusIn(abertas)).isEqualTo(1);
        assertThat(tarefaRepository.countByResponsavel_UsuarioIdAndStatusIn(responsavel.getUsuarioId(), abertas))
                .isEqualTo(1);
        assertThat(tarefaRepository.countByStatusInAndDataVencimentoBefore(abertas, LocalDate.now()))
                .isEqualTo(1);
        assertThat(tarefaRepository.countByStatusAndConcluidoEmBetween(
                StatusTarefa.CONCLUIDO,
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now().plusMinutes(1)))
                .isEqualTo(1);

        assertThat(tarefaRepository.findAll(TarefaSpecs.filtrar(
                null, StatusTarefa.A_FAZER, null, "fiscal", "declarar", null, null, true)))
                .extracting(Tarefa::getId)
                .containsExactly(atrasada.getId());
    }

    @Test
    @DisplayName("DocumentoClienteSpecs filtra por cliente e status")
    void documentoClienteSpecs() {
        Cliente cliente = persistirCliente("C010", "Docs", "22222222222222", StatusCliente.ATIVO);
        em.persist(DocumentoCliente.builder()
                .cliente(cliente)
                .tipo(TipoDocumentoCliente.COMPROVANTE)
                .nomeOriginal("c.pdf")
                .nomeArmazenado("c.pdf")
                .contentType("application/pdf")
                .tamanhoBytes(10L)
                .hashSha256("a".repeat(64))
                .status(StatusDocumentoCliente.RECEBIDO)
                .build());
        em.flush();
        em.clear();

        assertThat(documentoClienteRepository.findAll(
                DocumentoClienteSpecs.filtrar(cliente.getClienteId(), StatusDocumentoCliente.RECEBIDO, null)))
                .hasSize(1);
        assertThat(documentoClienteRepository.findAll(
                DocumentoClienteSpecs.filtrar(cliente.getClienteId(), StatusDocumentoCliente.ARQUIVADO, null)))
                .isEmpty();
    }

    private Cliente persistirCliente(String codigo, String nome, String cpfCnpj, StatusCliente status) {
        return em.persist(Cliente.builder()
                .codigo(codigo)
                .nome(nome)
                .cpfCnpj(cpfCnpj)
                .statusCliente(status)
                .saldoDevedor(BigDecimal.ZERO)
                .portalHabilitado(true)
                .build());
    }

    private Usuario persistirUsuario(String telefone, String nome) {
        return em.persistAndFlush(Usuario.builder()
                .telefone(telefone)
                .senha("hash")
                .nome(nome)
                .perfil(Perfil.FUNCIONARIO)
                .build());
    }

    private void persistirMovimentacao(LivroCaixaCategoria categoria,
                                      BigDecimal valor,
                                      LocalDate dataMovimentacao,
                                      LocalDate dataPagamento,
                                      LivroCaixaStatusMovimentacao status) {
        em.persist(LivroCaixaMovimentacao.builder()
                .tipo(LivroCaixaTipoMovimentacao.ENTRADA)
                .descricao("Mov")
                .valorCentavos(valor)
                .categoria(categoria)
                .dataMovimentacao(dataMovimentacao)
                .dataPagamento(dataPagamento)
                .status(status)
                .origem(LivroCaixaOrigemMovimentacao.MANUAL)
                .criadoPor("teste")
                .build());
    }
}
