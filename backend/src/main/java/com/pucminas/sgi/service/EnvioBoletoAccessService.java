package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import org.springframework.stereotype.Service;
import com.pucminas.sgi.exception.AccessDeniedBusinessException;

import java.util.UUID;


@Service
public class EnvioBoletoAccessService {

    private final StaffAccessService staffAccessService;

    public EnvioBoletoAccessService(StaffAccessService staffAccessService) {
        this.staffAccessService = staffAccessService;
    }

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
