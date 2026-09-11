package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.EmailConfigRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Popula apenas usuários de login e configuração de e-mail.
 * Clientes e dívidas vêm do import (ClientesImportRunner) ou do uso da API.
 * Cria apenas os registros ausentes, sem alterar usuários ou configurações existentes.
 */
@Component
@Profile("!test")
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final EmailConfigRepository emailConfigRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${sgi.seed.enabled:true}")
    private boolean seedEnabled;

    public DataSeeder(UsuarioRepository usuarioRepository,
                      EmailConfigRepository emailConfigRepository,
                      PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.emailConfigRepository = emailConfigRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("Seed desabilitado (sgi.seed.enabled=false).");
            return;
        }

        criarUsuarioSeAusente("josecarlos", "484659", "Responsável Financeiro", Perfil.RESPONSAVEL_FINANCEIRO);
        criarUsuarioSeAusente("claudia", "2527", "Proprietária", Perfil.PROPRIETARIA);

        if (emailConfigRepository.count() == 0) {
            EmailConfig emailConfig = EmailConfig.builder()
                    .host("smtp.gmail.com")
                    .porta(587)
                    .usuario("")
                    .senha("")
                    .usarTLS(true)
                    .emailRemetente("noreply@escritorio.com")
                    .nomeRemetente("Escritório Contábil")
                    .ativo(false)
                    .atualizadoEm(LocalDateTime.now())
                    .build();
            emailConfigRepository.save(emailConfig);
        }
        log.info("Seed concluído; usuários e configuração de e-mail existentes foram preservados.");
    }

    private void criarUsuarioSeAusente(String login, String senha, String nome, Perfil perfil) {
        if (usuarioRepository.findByTelefone(login).isPresent()) {
            return;
        }
        usuarioRepository.save(Usuario.builder()
                .telefone(login)
                .senha(passwordEncoder.encode(senha))
                .nome(nome)
                .perfil(perfil)
                .statusUsuario(StatusUsuario.ATIVO)
                .build());
    }
}
