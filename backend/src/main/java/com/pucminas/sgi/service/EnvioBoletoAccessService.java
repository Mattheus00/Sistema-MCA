package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
public class EnvioBoletoAccessService {

    private final StaffAccessService staffAccessService;

    public EnvioBoletoAccessService(StaffAccessService staffAccessService) {
        this.staffAccessService = staffAccessService;
    }

    public Usuario assertPodeGerenciarBoletos(UUID usuarioId) {
        try {
            return staffAccessService.assertPodeAcessoFinanceiroCompleto(usuarioId);
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().value() == FORBIDDEN.value()
                    && ex.getReason() != null
                    && ex.getReason().contains("esta área")) {
                throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão para envio de boletos.");
            }
            throw ex;
        }
    }
}
