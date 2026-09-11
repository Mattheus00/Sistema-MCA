package com.pucminas.sgi.service;

import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.dto.request.*;
import com.pucminas.sgi.entity.*;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    UsuarioRepository usuarios = mock(UsuarioRepository.class);
    TokenRecuperacaoSenhaRepository tokens = mock(TokenRecuperacaoSenhaRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    EmailGateway email = mock(EmailGateway.class);
    Clock clock = Clock.fixed(Instant.parse("2026-09-11T00:00:00Z"), ZoneOffset.UTC);
    AuthService service = new AuthService(usuarios, mock(JwtTokenProvider.class), encoder, tokens, email, clock);
    LocalDateTime agora = LocalDateTime.now(clock);

    @BeforeEach void configurar() { ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com/"); }

    @Test void solicitaSemRevelarLoginAusenteOuSemEmail() {
        when(usuarios.findByTelefone("sem-email")).thenReturn(Optional.of(Usuario.builder().usuarioId(UUID.randomUUID()).build()));
        var inexistente = service.solicitarRecuperacaoSenha(new SolicitarRecuperacaoSenhaDTO("inexistente"));
        var semEmail = service.solicitarRecuperacaoSenha(new SolicitarRecuperacaoSenhaDTO("sem-email"));
        assertThat(inexistente).isEqualTo(semEmail);
        assertThat(inexistente.getMensagem()).isEqualTo(AuthService.MENSAGEM_RECUPERACAO);
        verifyNoInteractions(tokens, email, encoder);
    }

    @Test void salvaApenasHashDeTokenAleatorio32BytesEEnviaLink() throws Exception {
        Usuario usuario = Usuario.builder().usuarioId(UUID.randomUUID()).email("teste@example.com").build();
        when(usuarios.findByTelefone("teste")).thenReturn(Optional.of(usuario));
        var response = service.solicitarRecuperacaoSenha(new SolicitarRecuperacaoSenhaDTO(" teste "));
        ArgumentCaptor<TokenRecuperacaoSenha> salvo = ArgumentCaptor.forClass(TokenRecuperacaoSenha.class);
        ArgumentCaptor<String> corpo = ArgumentCaptor.forClass(String.class);
        verify(tokens).save(salvo.capture());
        verify(email).enviar(eq("teste@example.com"), eq("Recuperação de senha"), corpo.capture(), isNull());
        String token = corpo.getValue().split("token=", 2)[1].split("\\n", 2)[0];
        assertThat(Base64.getUrlDecoder().decode(token)).hasSize(32);
        assertThat(salvo.getValue().getTokenHash()).isEqualTo(hash(token)).isNotEqualTo(token);
        assertThat(salvo.getValue().getExpiraEm()).isEqualTo(agora.plusMinutes(30));
        assertThat(salvo.getValue().getUsadoEm()).isNull();
        assertThat(corpo.getValue()).contains("https://example.com/redefinir-senha?token=");
        assertThat(response.getMensagem()).isEqualTo(AuthService.MENSAGEM_RECUPERACAO);
        verifyNoInteractions(encoder);
    }

    @Test void falhaSmtpMantemRespostaNeutra() {
        when(usuarios.findByTelefone("teste")).thenReturn(Optional.of(Usuario.builder().email("teste@example.com").build()));
        doThrow(new RuntimeException("falha SMTP")).when(email).enviar(anyString(), anyString(), anyString(), isNull());
        assertThat(service.solicitarRecuperacaoSenha(new SolicitarRecuperacaoSenhaDTO("teste")).getMensagem())
                .isEqualTo(AuthService.MENSAGEM_RECUPERACAO);
    }

    @Test void tokenValidoAlteraSomenteSenhaEDepoisNaoPodeSerReusado() throws Exception {
        TokenRecuperacaoSenha token = tokenValido();
        when(tokens.findByTokenHash(hash("token-sintetico"))).thenReturn(Optional.of(token));
        when(tokens.consumirSeValido(token.getId(), agora)).thenReturn(1, 0);
        when(encoder.encode("nova-senha")).thenReturn("hash-novo");
        var dto = new RedefinirSenhaTokenDTO("token-sintetico", "nova-senha", "nova-senha");
        service.redefinirSenhaComToken(dto);
        assertThat(token.getUsuario().getSenha()).isEqualTo("hash-novo");
        assertThat(token.getUsuario().getTelefone()).isEqualTo("teste");
        assertThatThrownBy(() -> service.redefinirSenhaComToken(dto)).isInstanceOf(BusinessRuleException.class)
                .hasMessage("Token inválido ou expirado.");
        verify(usuarios).save(token.getUsuario());
        verify(encoder).encode("nova-senha");
    }

    @ParameterizedTest @ValueSource(strings = {"expirado", "no-limite", "usado", "inexistente", "concorrente"})
    void rejeitaTokensInvalidosSemAlterarSenha(String estado) throws Exception {
        TokenRecuperacaoSenha token = tokenValido();
        if (estado.equals("expirado")) token.setExpiraEm(agora.minusSeconds(1));
        if (estado.equals("no-limite")) token.setExpiraEm(agora);
        if (estado.equals("usado")) token.setUsadoEm(agora.minusMinutes(1));
        when(tokens.findByTokenHash(hash("token-sintetico")))
                .thenReturn(estado.equals("inexistente") ? Optional.empty() : Optional.of(token));
        assertThatThrownBy(() -> service.redefinirSenhaComToken(
                new RedefinirSenhaTokenDTO("token-sintetico", "nova-senha", "nova-senha")))
                .isInstanceOf(BusinessRuleException.class).hasMessage("Token inválido ou expirado.");
        verifyNoInteractions(usuarios, encoder);
        assertThat(token.getUsuario().getSenha()).isEqualTo("hash-anterior");
    }

    @Test void confirmacaoIncorretaNaoConsomeToken() {
        assertThatThrownBy(() -> service.redefinirSenhaComToken(new RedefinirSenhaTokenDTO("token", "senha1", "senha2")))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Confirmação");
        verifyNoInteractions(tokens, usuarios, encoder);
    }

    @Test void legadoDesabilitadoPorPadraoNaoConsultaUsuario() {
        assertThatThrownBy(() -> service.validarLoginRecuperacao(new ValidarLoginRequestDTO("teste")))
                .isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.redefinirSenhaSemToken(new RedefinirSenhaRequestDTO("teste", "nova1", "nova1")))
                .isInstanceOf(BusinessRuleException.class);
        verifyNoInteractions(usuarios, encoder);
    }

    @Test void legadoExplicitamenteHabilitadoMantemContrato() {
        ReflectionTestUtils.setField(service, "passwordRecoveryEnabled", true);
        Usuario usuario = Usuario.builder().telefone("teste").nome("Nome existente").senha("hash-anterior").build();
        when(usuarios.findByTelefone("teste")).thenReturn(Optional.of(usuario));
        assertThat(service.validarLoginRecuperacao(new ValidarLoginRequestDTO("teste")).getNome()).isEqualTo("Nome existente");
        when(encoder.encode("nova1")).thenReturn("hash-novo");
        service.redefinirSenhaSemToken(new RedefinirSenhaRequestDTO("teste", "nova1", "nova1"));
        assertThat(usuario.getSenha()).isEqualTo("hash-novo");
    }

    private TokenRecuperacaoSenha tokenValido() {
        return TokenRecuperacaoSenha.builder().id(UUID.randomUUID()).expiraEm(agora.plusMinutes(1))
                .usuario(Usuario.builder().telefone("teste").senha("hash-anterior").build()).build();
    }
    private String hash(String valor) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8)));
    }
}
