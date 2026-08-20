package com.pucminas.sgi.util;

/**
 * Corpo do e-mail de aviso de pendência com PDF anexado (mesmo canal SMTP dos boletos).
 */
public final class AvisoPendenciaEmailTemplateBuilder {

    private AvisoPendenciaEmailTemplateBuilder() {
    }

    public static String assunto(String nomeEmpresa) {
        return "Aviso de pendência financeira – " + (nomeEmpresa != null ? nomeEmpresa : "Escritório");
    }

    public static String textoPlano(String nomeCliente, String nomeEmpresa) {
        return """
                Olá, %s.

                Segue em anexo o aviso de pendência financeira referente aos honorários em aberto.

                Pedimos, por gentileza, que confira os valores e as datas de vencimento antes de realizar o pagamento.

                Em caso de dúvidas ou divergências, entre em contato conosco.

                Atenciosamente,
                %s
                """.formatted(
                nomeCliente != null ? nomeCliente : "Cliente",
                nomeEmpresa != null ? nomeEmpresa : "Escritório");
    }

    public static String html(String nomeCliente, String nomeEmpresa) {
        String cliente = escape(nomeCliente != null ? nomeCliente : "Cliente");
        String empresa = escape(nomeEmpresa != null ? nomeEmpresa : "Escritório");
        return """
                <!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#333;">
                <p>Olá, <strong>%s</strong>.</p>
                <p>Segue em anexo o aviso de pendência financeira referente aos honorários em aberto.</p>
                <p>Pedimos, por gentileza, que confira os valores e as datas de vencimento antes de realizar o pagamento.</p>
                <p>Em caso de dúvidas ou divergências, entre em contato conosco.</p>
                <p>Atenciosamente,<br><strong>%s</strong></p>
                </body></html>
                """.formatted(cliente, empresa);
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
