package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.EnvioBoleto;
import com.pucminas.sgi.entity.LoteEnvioBoleto;
import org.springframework.stereotype.Service;

@Service
public class LoteEnvioBoletoRelatorioService {

    public String gerarCsv(LoteEnvioBoleto lote) {
        StringBuilder sb = new StringBuilder();
        sb.append("cliente;email;arquivo;status;data_envio;mensagem_erro;simulado\n");
        for (EnvioBoleto item : lote.getItens()) {
            sb.append(csv(item.getCliente() != null ? item.getCliente().getNome() : ""))
                    .append(';')
                    .append(csv(item.getEmailDestinatario()))
                    .append(';')
                    .append(csv(item.getNomeArquivoOriginal()))
                    .append(';')
                    .append(item.getStatus())
                    .append(';')
                    .append(item.getDataEnvio() != null ? item.getDataEnvio() : "")
                    .append(';')
                    .append(csv(item.getMensagemErro()))
                    .append(';')
                    .append(item.getSimulado())
                    .append('\n');
        }
        return sb.toString();
    }

    static String csv(String valor) {
        if (valor == null) {
            return "";
        }
        String v = valor.replace("\"", "\"\"");
        if (v.contains(";") || v.contains("\"") || v.contains("\n")) {
            return "\"" + v + "\"";
        }
        return v;
    }
}
