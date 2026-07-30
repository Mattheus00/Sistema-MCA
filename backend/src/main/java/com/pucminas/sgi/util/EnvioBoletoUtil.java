package com.pucminas.sgi.util;

import com.pucminas.sgi.entity.EnvioBoleto;

/**
 * Regras compartilhadas entre serviço e mapper de envio de boletos.
 */
public final class EnvioBoletoUtil {

    private EnvioBoletoUtil() {
    }

    public static String resolverEmailDestinatario(EnvioBoleto item) {
        if (item == null) {
            return null;
        }
        String email = TelefoneClienteUtil.normalizarEmailOpcional(item.getEmailDestinatario());
        if (email != null) {
            return email;
        }
        if (item.getCliente() == null) {
            return null;
        }
        return TelefoneClienteUtil.normalizarEmailOpcional(item.getCliente().getEmail());
    }

    /**
     * Copia o e-mail do cadastro do cliente para o item quando ainda não persistido.
     */
    public static void sincronizarEmailDoCliente(EnvioBoleto item) {
        if (item == null || item.getCliente() == null) {
            return;
        }
        String atual = TelefoneClienteUtil.normalizarEmailOpcional(item.getEmailDestinatario());
        if (atual != null) {
            return;
        }
        String doCliente = TelefoneClienteUtil.normalizarEmailOpcional(item.getCliente().getEmail());
        if (doCliente != null) {
            item.setEmailDestinatario(doCliente);
        }
    }
}
