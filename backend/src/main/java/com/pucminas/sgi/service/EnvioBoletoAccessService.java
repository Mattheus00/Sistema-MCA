package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
public class EnvioBoletoAccessService {

    private final UsuarioRepository usuarioRepository;

    public EnvioBoletoAccessService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario assertPodeGerenciarBoletos(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        if (usuario.getStatusUsuario() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(FORBIDDEN, "Usuário inativo.");
        }
        Perfil perfil = usuario.getPerfil();
        if (perfil != Perfil.RESPONSAVEL_FINANCEIRO && perfil != Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão para envio de boletos.");
        }
        return usuario;
    }
}
