package com.pucminas.sgi.security;

import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.DividaRepository;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PortalAccessGuard {

    private final DividaRepository dividaRepository;


    public Divida carregarDividaDoCliente(UUID dividaId, UUID clienteId) {
        Divida divida = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        if (!divida.getCliente().getClienteId().equals(clienteId)) {
            throw new BusinessRuleException("Acesso negado a esta dívida.");
        }
        return divida;
    }
}
