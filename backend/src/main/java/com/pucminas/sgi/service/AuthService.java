package com.pucminas.sgi.service;

import com.pucminas.sgi.security.JwtTokenProvider;
import com.pucminas.sgi.dto.request.LoginDTO;
import com.pucminas.sgi.dto.request.RedefinirSenhaRequestDTO;
import com.pucminas.sgi.dto.request.ValidarLoginRequestDTO;
import com.pucminas.sgi.dto.response.LoginResponseDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.dto.response.ValidarLoginResponseDTO;
import com.pucminas.sgi.entity.TokenRevogado;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.repository.TokenRevogadoRepository;
import com.pucminas.sgi.entity.TokenRecuperacaoSenha;
import com.pucminas.sgi.repository.TokenRecuperacaoSenhaRepository;
import com.pucminas.sgi.dto.request.SolicitarRecuperacaoSenhaDTO;
import com.pucminas.sgi.dto.request.RedefinirSenhaTokenDTO;
import com.pucminas.sgi.dto.response.MensagemResponseDTO;
import org.springframework.security.authentication.BadCredentialsException;
import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Serviço de autenticação: login JWT e validação de token.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    private final TokenRecuperacaoSenhaRepository tokenRepository;
    private final TokenRevogadoRepository tokenRevogadoRepository;
    private final EmailGateway emailGateway;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    public static final String MENSAGEM_RECUPERACAO =
            "Se o login possuir um e-mail cadastrado, você receberá as instruções para redefinir sua senha.";

    @Value("${sgi.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${sgi.auth.password-recovery-enabled:false}")
    private boolean passwordRecoveryEnabled;


    private void ensurePasswordRecoveryEnabled() {
        if (!passwordRecoveryEnabled) {
            throw new BusinessRuleException(
                    "Recuperação de senha pública está desabilitada. Contate a proprietária do escritório.");
        }
    }

    @Transactional(readOnly = true)
    public LoginResponseDTO autenticar(LoginDTO dto) {
        String identificador = dto.getIdentificador();
        if (identificador == null || identificador.isBlank()) {
            throw new BadCredentialsException("Login é obrigatório");
        }
        Usuario usuario = usuarioRepository.findByTelefone(identificador)
                .orElseThrow(() -> new BadCredentialsException("Login ou senha inválidos"));
        if (usuario.getStatusUsuario() == StatusUsuario.PENDENTE_APROVACAO) {
            throw new BadCredentialsException("Cadastro pendente de aprovação da proprietária.");
        }
        if (usuario.getStatusUsuario() != StatusUsuario.ATIVO) {
            throw new BadCredentialsException("Usuário inativo.");
        }
        if (!passwordEncoder.matches(dto.getSenha(), usuario.getSenha())) {
            throw new BadCredentialsException("Login ou senha inválidos");
        }
        String token = jwtTokenProvider.generateToken(
                usuario.getUsuarioId(),
                usuario.getTelefone(),
                usuario.getPerfil(),
                usuario.getNome()
        );
        registrarAcesso(usuario.getUsuarioId());
        log.info("Login realizado: {}", usuario.getTelefone());
        return LoginResponseDTO.builder()
                .token(token)
                .perfil(usuario.getPerfil())
                .nome(usuario.getNome())
                .login(usuario.getTelefone())
                .build();
    }

    /** Blacklist do {@code jti}. Tokens antigos sem jti só são descartados no cliente. */
    @Transactional
    public void revogarToken(String tokenBruto) {
        if (tokenBruto == null || tokenBruto.isBlank()) {
            return;
        }
        JwtTokenProvider.JwtClaims claims = jwtTokenProvider.getClaims(tokenBruto);
        if (claims == null || claims.jti() == null || claims.jti().isBlank()) {
            return;
        }
        LocalDateTime expiraEm = claims.expiration() != null
                ? LocalDateTime.ofInstant(claims.expiration().toInstant(), clock.getZone())
                : LocalDateTime.now(clock).plusDays(1);
        if (!tokenRevogadoRepository.existsById(claims.jti())) {
            tokenRevogadoRepository.save(TokenRevogado.builder()
                    .jti(claims.jti())
                    .expiraEm(expiraEm)
                    .build());
        }
        log.info("Token revogado no logout.");
    }

    @Transactional
    public void registrarAcesso(UUID usuarioId) {
        usuarioRepository.findById(usuarioId).ifPresent(u -> {
            u.setUltimoAcesso(LocalDateTime.now(clock));
            usuarioRepository.save(u);
        });
    }

    @Transactional(readOnly = true)
    public UsuarioResponseDTO dadosUsuario(UUID usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        return UsuarioResponseDTO.builder()
                .usuarioId(u.getUsuarioId())
                .login(u.getTelefone())
                .nome(u.getNome())
                .perfil(u.getPerfil())
                .statusUsuario(u.getStatusUsuario())
                .ultimoAcesso(u.getUltimoAcesso())
                .criadoEm(u.getCriadoEm())
                .build();
    }

    /** @deprecated Use solicitarRecuperacaoSenha com token enviado por e-mail. */
    @Deprecated
    @Transactional(readOnly = true)
    public ValidarLoginResponseDTO validarLoginRecuperacao(ValidarLoginRequestDTO dto) {
        ensurePasswordRecoveryEnabled();
        String login = dto.getLogin() == null ? "" : dto.getLogin().trim();
        Usuario usuario = usuarioRepository.findByTelefone(login)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário com login", login));
        return ValidarLoginResponseDTO.builder()
                .encontrado(true)
                .login(usuario.getTelefone())
                .nome(usuario.getNome())
                .mensagem("Login encontrado. Você já pode definir uma nova senha.")
                .build();
    }

    /** @deprecated Use redefinirSenhaComToken; o fluxo legado exige habilitação explícita. */
    @Deprecated
    @Transactional
    public void redefinirSenhaSemToken(RedefinirSenhaRequestDTO dto) {
        ensurePasswordRecoveryEnabled();
        String login = dto.getLogin() == null ? "" : dto.getLogin().trim();
        if (!dto.getNovaSenha().equals(dto.getConfirmarSenha())) {
            throw new BusinessRuleException("Confirmação de senha não confere.");
        }
        Usuario usuario = usuarioRepository.findByTelefone(login)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário com login", login));
        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
        log.info("Senha redefinida via recuperação para login: {}", login);
    }

    @Transactional
    public MensagemResponseDTO solicitarRecuperacaoSenha(SolicitarRecuperacaoSenhaDTO dto) {
        String login = dto.getLogin() == null ? "" : dto.getLogin().trim();
        usuarioRepository.findByTelefone(login).ifPresent(usuario -> {
            if (usuario.getEmail() == null || usuario.getEmail().isBlank()) {
                log.warn("Recuperação solicitada para usuário sem e-mail cadastrado: {}", usuario.getUsuarioId());
                return;
            }
            byte[] bytes = new byte[32];
            secureRandom.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            tokenRepository.save(TokenRecuperacaoSenha.builder()
                    .usuario(usuario).tokenHash(hashToken(token))
                    .expiraEm(LocalDateTime.now(clock).plusMinutes(30)).build());
            String link = frontendUrl.replaceAll("/+$", "") + "/redefinir-senha?token=" + token;
            try {
                emailGateway.enviar(usuario.getEmail(), "Recuperação de senha",
                        "Use o link para redefinir sua senha em até 30 minutos: " + link
                                + "\nSe não solicitou esta alteração, ignore este e-mail.", null);
            } catch (RuntimeException ex) {
                // A indisponibilidade de SMTP não revela se o login existe. Não registrar token/corpo.
                log.warn("Falha no envio da recuperação de senha: {}", ex.getClass().getSimpleName());
            }
        });
        return MensagemResponseDTO.builder().mensagem(MENSAGEM_RECUPERACAO).build();
    }

    @Transactional
    public void redefinirSenhaComToken(RedefinirSenhaTokenDTO dto) {
        if (dto.getNovaSenha() == null || !dto.getNovaSenha().equals(dto.getConfirmarSenha())) {
            throw new BusinessRuleException("Confirmação de senha não confere.");
        }
        if (dto.getNovaSenha().isBlank() || dto.getNovaSenha().length() < 4 || dto.getNovaSenha().length() > 255) {
            throw new BusinessRuleException("Nova senha deve ter entre 4 e 255 caracteres.");
        }
        if (dto.getToken() == null || dto.getToken().isBlank()) {
            throw tokenInvalido();
        }
        TokenRecuperacaoSenha recuperacao = tokenRepository.findByTokenHash(hashToken(dto.getToken()))
                .orElseThrow(this::tokenInvalido);
        LocalDateTime agora = LocalDateTime.now(clock);
        if (recuperacao.getUsadoEm() != null || !recuperacao.getExpiraEm().isAfter(agora)
                || tokenRepository.consumirSeValido(recuperacao.getId(), agora) != 1) {
            throw tokenInvalido();
        }
        Usuario usuario = recuperacao.getUsuario();
        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
    }

    private BusinessRuleException tokenInvalido() {
        return new BusinessRuleException("Token inválido ou expirado.");
    }

    private String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível.", ex);
        }
    }
}
