package com.pucminas.sgi.security;

import com.pucminas.sgi.entity.Usuario;
import org.springframework.stereotype.Service;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;
import lombok.RequiredArgsConstructor;

import java.util.UUID;


@Service
@RequiredArgsConstructor
public class EnvioBoletoAccessService {

    private final StaffAccessService staffAccessService;


    public Usuario assertPodeGerenciarBoletos(UUID usuarioId) {
        try {
            return staffAccessService.assertPodeAcessoFinanceiroCompleto(usuarioId);
        } catch (AccessDeniedBusinessException ex) {
            if (ex.getMessage() != null
                    && ex.getMessage().contains("esta área")) {
                throw new AccessDeniedBusinessException("Perfil sem permissão para envio de boletos.");
            }
            throw ex;
        }
    }
}
