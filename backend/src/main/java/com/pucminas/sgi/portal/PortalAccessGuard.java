package com.pucminas.sgi.portal;

import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.DividaRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class PortalAccessGuard {

    private final DividaRepository dividaRepository;

    public PortalAccessGuard(DividaRepository dividaRepository) {
        this.dividaRepository = dividaRepository;
    }

    public Divida carregarDividaDoCliente(UUID dividaId, UUID clienteId) {
        Divida divida = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        if (!divida.getCliente().getClienteId().equals(clienteId)) {
            throw new BusinessRuleException("Acesso negado a esta dívida.");
        }
        return divida;
    }
}
