package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.CadastroUsuarioDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.DuplicateResourceException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UsuarioService {

    private static final Logger log = LoggerFactory.getLogger(UsuarioService.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void cadastrar(CadastroUsuarioDTO dto) {
        String telefone = dto.getLogin() != null && !dto.getLogin().isBlank()
                ? dto.getLogin()
                : dto.getTelefone1();
        if (telefone == null || telefone.isBlank()) {
            throw new IllegalArgumentException("Login ou telefone1 é obrigatório.");
        }
        if (usuarioRepository.findByTelefone(telefone).isPresent()) {
            throw new DuplicateResourceException("Já existe usuário com este telefone/login.");
        }
        Perfil perfil = "PROPRIETARIA".equalsIgnoreCase(dto.getPermissao()) ? Perfil.PROPRIETARIA : Perfil.RESPONSAVEL_FINANCEIRO;
        String senhaHash = dto.getSenha() != null && !dto.getSenha().isBlank()
                ? passwordEncoder.encode(dto.getSenha())
                : passwordEncoder.encode("senha123");
        Usuario u = Usuario.builder()
                .telefone(telefone)
                .senha(senhaHash)
                .nome(dto.getNome())
                .perfil(perfil)
                .statusUsuario(Boolean.FALSE.equals(dto.getAtivo()) ? StatusUsuario.INATIVO : StatusUsuario.ATIVO)
                .build();
        usuarioRepository.save(u);
        log.info("Usuário cadastrado: {}", u.getTelefone());
    }
}
