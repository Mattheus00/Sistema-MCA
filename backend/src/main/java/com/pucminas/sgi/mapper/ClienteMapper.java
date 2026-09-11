package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.ClienteResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ClienteMapper {

    public ClienteResponseDTO toResponse(Cliente c, BigDecimal saldoDevedorReais) {
        return ClienteResponseDTO.builder()
                .clienteId(c.getClienteId())
                .codigo(c.getCodigo())
                .nome(c.getNome())
                .cpfCnpj(c.getCpfCnpj())
                .email(c.getEmail())
                .telefone(c.getTelefone())
                .celular(c.getCelular())
                .endereco(c.getEndereco())
                .statusCliente(c.getStatusCliente())
                .saldoDevedor(saldoDevedorReais)
                .criadoEm(c.getCriadoEm())
                .atualizadoEm(c.getAtualizadoEm())
                .build();
    }
}
