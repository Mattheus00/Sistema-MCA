package com.pucminas.sgi.util;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class EnvioBoletoUtilTest {

    @Test
    @DisplayName("Resolve e-mail do item quando já persistido")
    void resolveEmailDoItem() {
        EnvioBoleto item = EnvioBoleto.builder()
                .emailDestinatario("item@email.com")
                .build();
        assertEquals("item@email.com", EnvioBoletoUtil.resolverEmailDestinatario(item));
    }

    @Test
    @DisplayName("Faz fallback para e-mail do cliente")
    void resolveEmailDoCliente() {
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cliente")
                .cpfCnpj("12345678901")
                .email("cliente@email.com")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        EnvioBoleto item = EnvioBoleto.builder().cliente(cliente).build();
        assertEquals("cliente@email.com", EnvioBoletoUtil.resolverEmailDestinatario(item));
    }

    @Test
    @DisplayName("Sincroniza e-mail do cliente no item")
    void sincronizaEmailNoItem() {
        Cliente cliente = Cliente.builder()
                .clienteId(UUID.randomUUID())
                .nome("Cliente")
                .cpfCnpj("12345678901")
                .email("cliente@email.com")
                .statusCliente(StatusCliente.ATIVO)
                .build();
        EnvioBoleto item = EnvioBoleto.builder().cliente(cliente).build();
        EnvioBoletoUtil.sincronizarEmailDoCliente(item);
        assertEquals("cliente@email.com", item.getEmailDestinatario());
    }

    @Test
    @DisplayName("Sem cliente nem e-mail retorna nulo")
    void semEmail() {
        EnvioBoleto item = EnvioBoleto.builder().build();
        assertNull(EnvioBoletoUtil.resolverEmailDestinatario(item));
    }
}
