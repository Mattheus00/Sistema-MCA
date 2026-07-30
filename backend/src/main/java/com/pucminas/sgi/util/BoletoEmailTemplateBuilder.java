package com.pucminas.sgi.util;

public final class BoletoEmailTemplateBuilder {

    private BoletoEmailTemplateBuilder() {
    }

    public static String assunto(String nomeEmpresa) {
        return "Boleto disponível – " + (nomeEmpresa != null ? nomeEmpresa : "Escritório");
    }

    public static String textoPlano(String nomeCliente, String nomeEmpresa) {
        return """
                Olá, %s.

                Segue em anexo o boleto referente aos serviços contratados.

                Pedimos, por gentileza, que confira os dados, o valor e a data de vencimento antes de realizar o pagamento.

                Em caso de dúvidas ou divergências, entre em contato conosco antes do pagamento.

                Atenciosamente,
                %s
                """.formatted(nomeCliente != null ? nomeCliente : "Cliente", nomeEmpresa != null ? nomeEmpresa : "Escritório");
    }

    public static String html(String nomeCliente, String nomeEmpresa) {
        String cliente = escape(nomeCliente != null ? nomeCliente : "Cliente");
        String empresa = escape(nomeEmpresa != null ? nomeEmpresa : "Escritório");
        return """
                <!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#333;">
                <p>Olá, <strong>%s</strong>.</p>
                <p>Segue em anexo o boleto referente aos serviços contratados.</p>
                <p>Pedimos, por gentileza, que confira os dados, o valor e a data de vencimento antes de realizar o pagamento.</p>
                <p>Em caso de dúvidas ou divergências, entre em contato conosco antes do pagamento.</p>
                <p>Atenciosamente,<br><strong>%s</strong></p>
                </body></html>
                """.formatted(cliente, empresa);
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
