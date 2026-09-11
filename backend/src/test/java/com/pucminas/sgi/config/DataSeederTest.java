package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.EmailConfigRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private EmailConfigRepository emailConfigRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DataSeeder seeder;

    @BeforeEach
    void habilitarSeed() {
        ReflectionTestUtils.setField(seeder, "seedEnabled", true);
    }

    @Test
    void preservaTodosOsDadosDasContasExistentesMesmoInativas() {
        Usuario jose = usuarioExistente("josecarlos");
        Usuario claudia = usuarioExistente("claudia");
        claudia.setStatusUsuario(StatusUsuario.PENDENTE_APROVACAO);
        Usuario joseAntes = copiar(jose);
        Usuario claudiaAntes = copiar(claudia);
        when(usuarioRepository.findByTelefone("josecarlos")).thenReturn(Optional.of(jose));
        when(usuarioRepository.findByTelefone("claudia")).thenReturn(Optional.of(claudia));
        when(emailConfigRepository.count()).thenReturn(1L);

        seeder.run();

        assertThat(jose).usingRecursiveComparison().isEqualTo(joseAntes);
        assertThat(claudia).usingRecursiveComparison().isEqualTo(claudiaAntes);
        verify(usuarioRepository).findByTelefone("josecarlos");
        verify(usuarioRepository).findByTelefone("claudia");
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @ParameterizedTest
    @ValueSource(strings = {"josecarlos", "claudia"})
    void criaSomenteAContaAusenteSemAlterarAOutra(String loginAusente) {
        String loginExistente = loginAusente.equals("josecarlos") ? "claudia" : "josecarlos";
        Usuario existente = usuarioExistente(loginExistente);
        Usuario antes = copiar(existente);
        when(usuarioRepository.findByTelefone(loginExistente)).thenReturn(Optional.of(existente));
        when(usuarioRepository.findByTelefone(loginAusente)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(senhaPadrao(loginAusente))).thenReturn("hash-criado");
        when(emailConfigRepository.count()).thenReturn(1L);

        seeder.run();

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertContaPadrao(captor.getValue(), loginAusente, "hash-criado");
        assertThat(existente).usingRecursiveComparison().isEqualTo(antes);
        verify(passwordEncoder).encode(senhaPadrao(loginAusente));
        verifyNoMoreInteractions(passwordEncoder);
    }

    @Test
    void criaContasEEmailPadraoUmaUnicaVezEmBancoVazio() {
        Map<String, Usuario> usuarios = simularUsuariosPersistidos(new HashMap<>());
        when(passwordEncoder.encode("484659")).thenReturn("hash-jose");
        when(passwordEncoder.encode("2527")).thenReturn("hash-claudia");
        when(emailConfigRepository.count()).thenReturn(0L, 1L);

        seeder.run();
        seeder.run();

        assertThat(usuarios).hasSize(2);
        assertContaPadrao(usuarios.get("josecarlos"), "josecarlos", "hash-jose");
        assertContaPadrao(usuarios.get("claudia"), "claudia", "hash-claudia");
        verify(passwordEncoder).encode("484659");
        verify(passwordEncoder).encode("2527");
        verifyNoMoreInteractions(passwordEncoder);
        ArgumentCaptor<EmailConfig> captor = ArgumentCaptor.forClass(EmailConfig.class);
        verify(emailConfigRepository).save(captor.capture());
        EmailConfig config = captor.getValue();
        assertThat(config.getHost()).isEqualTo("smtp.gmail.com");
        assertThat(config.getPorta()).isEqualTo(587);
        assertThat(config.getUsuario()).isEmpty();
        assertThat(config.getSenha()).isEmpty();
        assertThat(config.getUsarTLS()).isTrue();
        assertThat(config.getEmailRemetente()).isEqualTo("noreply@escritorio.com");
        assertThat(config.getNomeRemetente()).isEqualTo("Escritório Contábil");
        assertThat(config.getAtivo()).isFalse();
        assertThat(config.getAtualizadoEm()).isNotNull();
    }

    @Test
    void preservaContasLegadasAoCriarLoginsAusentes() {
        Usuario financeiroLegado = usuarioExistente("31999999999");
        Usuario proprietariaLegada = usuarioExistente("31988888888");
        Usuario financeiroAntes = copiar(financeiroLegado);
        Usuario proprietariaAntes = copiar(proprietariaLegada);
        Map<String, Usuario> usuarios = simularUsuariosPersistidos(new HashMap<>(Map.of(
                financeiroLegado.getTelefone(), financeiroLegado,
                proprietariaLegada.getTelefone(), proprietariaLegada)));
        when(passwordEncoder.encode(anyString())).thenReturn("hash-criado");
        when(emailConfigRepository.count()).thenReturn(1L);

        seeder.run();

        assertThat(usuarios).containsOnlyKeys("31999999999", "31988888888", "josecarlos", "claudia");
        assertThat(financeiroLegado).usingRecursiveComparison().isEqualTo(financeiroAntes);
        assertThat(proprietariaLegada).usingRecursiveComparison().isEqualTo(proprietariaAntes);
        verify(usuarioRepository, never()).findByTelefone("31999999999");
        verify(usuarioRepository, never()).findByTelefone("31988888888");
        verify(usuarioRepository, never()).delete(any());
        verify(usuarioRepository, never()).deleteAll();
    }

    @Test
    void naoAlteraNemDuplicaEmailExistenteAoCriarUsuarios() {
        when(emailConfigRepository.count()).thenReturn(1L);
        when(passwordEncoder.encode(anyString())).thenReturn("hash-criado");

        seeder.run();

        verify(emailConfigRepository).count();
        verifyNoMoreInteractions(emailConfigRepository);
    }

    @Test
    void naoAcessaBancoNemCodificaSenhasQuandoDesabilitado() {
        ReflectionTestUtils.setField(seeder, "seedEnabled", false);

        seeder.run();

        verifyNoInteractions(usuarioRepository, emailConfigRepository, passwordEncoder);
    }

    private Map<String, Usuario> simularUsuariosPersistidos(Map<String, Usuario> usuarios) {
        when(usuarioRepository.findByTelefone(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(usuarios.get(invocation.getArgument(0))));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuarios.put(usuario.getTelefone(), usuario);
            return usuario;
        });
        return usuarios;
    }

    private Usuario usuarioExistente(String login) {
        return Usuario.builder()
                .usuarioId(UUID.randomUUID())
                .telefone(login)
                .senha("hash-personalizado-" + login)
                .nome("Nome cadastrado de " + login)
                .perfil(Perfil.FUNCIONARIO)
                .statusUsuario(StatusUsuario.INATIVO)
                .criadoEm(LocalDateTime.of(2020, 1, 2, 3, 4))
                .ultimoAcesso(LocalDateTime.of(2021, 2, 3, 4, 5))
                .build();
    }

    private Usuario copiar(Usuario usuario) {
        return new Usuario(usuario.getUsuarioId(), usuario.getTelefone(), usuario.getSenha(),
                usuario.getNome(), usuario.getPerfil(), usuario.getStatusUsuario(),
                usuario.getUltimoAcesso(), usuario.getCriadoEm());
    }

    private String senhaPadrao(String login) {
        return login.equals("josecarlos") ? "484659" : "2527";
    }

    private void assertContaPadrao(Usuario usuario, String login, String senhaCodificada) {
        assertThat(usuario.getTelefone()).isEqualTo(login);
        assertThat(usuario.getSenha()).isEqualTo(senhaCodificada);
        assertThat(usuario.getNome()).isEqualTo(login.equals("josecarlos") ? "Responsável Financeiro" : "Proprietária");
        assertThat(usuario.getPerfil()).isEqualTo(login.equals("josecarlos") ? Perfil.RESPONSAVEL_FINANCEIRO : Perfil.PROPRIETARIA);
        assertThat(usuario.getStatusUsuario()).isEqualTo(StatusUsuario.ATIVO);
    }
}
