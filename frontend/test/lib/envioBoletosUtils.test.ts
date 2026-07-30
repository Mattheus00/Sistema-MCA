import { describe, it, expect } from "vitest";

import {

  validarArquivosPdf,

  itemBloqueiaEnvio,

  itemProntoParaEnvio,

  podeEnviarSelecionados,

  itensComErroParaReenvio,

  indicadorStatusItem,

  itemPrecisaConfirmacao,

  idsProntosParaEnvio,

  exibirEmailItem,

} from "@/lib/envioBoletosUtils";

import type { ItemEnvioBoleto } from "@/types/api";



function makeFile(name: string, type = "application/pdf", size = 1024): File {

  const blob = new Blob(["x".repeat(size)], { type });

  return new File([blob], name, { type });

}



function makeItem(partial: Partial<ItemEnvioBoleto>): ItemEnvioBoleto {

  const envioBoletoId = partial.envioBoletoId ?? partial.itemId ?? "1";

  return {

    ...partial,

    envioBoletoId,

    itemId: envioBoletoId,

    nomeArquivoOriginal: partial.nomeArquivoOriginal ?? "boleto.pdf",

    status: partial.status ?? "PRONTO_PARA_ENVIO",

  };

}



describe("envioBoletosUtils", () => {

  it("valida apenas PDFs e rejeita duplicados na seleção", () => {

    const pdf = makeFile("a.pdf");

    const txt = makeFile("b.txt", "text/plain");

    const dup = makeFile("a.pdf");

    const { validos, erros } = validarArquivosPdf([pdf, txt, dup]);

    expect(validos).toHaveLength(1);

    expect(erros.some((e) => e.includes("PDF"))).toBe(true);

    expect(erros.some((e) => e.includes("duplicado"))).toBe(true);

  });



  it("identifica itens que bloqueiam envio apenas pelo status da API", () => {

    expect(itemBloqueiaEnvio(makeItem({ status: "AGUARDANDO_CORRECAO", emailDestinatario: "a@b.com" }))).toBe(true);

    expect(itemBloqueiaEnvio(makeItem({ status: "PRONTO_PARA_ENVIO", emailDestinatario: "" }))).toBe(false);

    expect(itemProntoParaEnvio(makeItem({ status: "PRONTO_PARA_ENVIO", emailDestinatario: "" }))).toBe(true);

    expect(itemBloqueiaEnvio(makeItem({ status: "PRONTO_PARA_ENVIO", emailDestinatario: "a@b.com", clienteNome: "Cliente" }))).toBe(false);

    expect(itemBloqueiaEnvio(makeItem({ metodoIdentificacao: "NAO_IDENTIFICADO", status: "NAO_IDENTIFICADO" }))).toBe(true);

  });



  it("habilita envio somente com itens PRONTO_PARA_ENVIO selecionados", () => {

    const itens = [

      makeItem({ itemId: "ok", status: "PRONTO_PARA_ENVIO", emailDestinatario: "a@b.com", clienteNome: "A" }),

      makeItem({ itemId: "bad", status: "AGUARDANDO_CORRECAO", emailDestinatario: "c@d.com", clienteNome: "B" }),

    ];

    expect(podeEnviarSelecionados(itens, new Set(["ok"]))).toBe(true);

    expect(podeEnviarSelecionados(itens, new Set(["bad"]))).toBe(false);

    expect(podeEnviarSelecionados(itens, new Set(["ok", "bad"]))).toBe(true);

  });



  it("filtra ids prontos para envio", () => {

    const itens = [

      makeItem({ itemId: "ok", status: "PRONTO_PARA_ENVIO" }),

      makeItem({ itemId: "bad", status: "AGUARDANDO_CORRECAO" }),

    ];

    expect(idsProntosParaEnvio(itens, new Set(["ok", "bad"]))).toEqual(["ok"]);

  });



  it("filtra itens com erro para reenvio parcial", () => {

    const itens = [

      makeItem({ itemId: "1", status: "ENVIADO" }),

      makeItem({ itemId: "2", status: "ERRO", erro: "Falha SMTP" }),

      makeItem({ itemId: "3", status: "ERRO", erro: "Sem e-mail" }),

    ];

    const erros = itensComErroParaReenvio(itens);

    expect(erros).toHaveLength(2);

    expect(erros.every((i) => i.status === "ERRO")).toBe(true);

  });



  it("retorna indicador visual exclusivamente pelo status da API", () => {

    expect(indicadorStatusItem(makeItem({ status: "ENVIADO", emailDestinatario: "a@b.com", clienteNome: "A" })).texto).toBe("Enviado");

    expect(indicadorStatusItem(makeItem({ status: "ERRO", emailDestinatario: "a@b.com", clienteNome: "A" })).cor).toBe("vermelho");

    expect(indicadorStatusItem(makeItem({ status: "IGNORADO", emailDestinatario: "a@b.com", clienteNome: "A" })).cor).toBe("cinza");

    expect(indicadorStatusItem(makeItem({ metodoIdentificacao: "NAO_IDENTIFICADO", status: "NAO_IDENTIFICADO" })).texto).toBe("Não identificado");

    expect(indicadorStatusItem(makeItem({ status: "PRONTO_PARA_ENVIO", clienteNome: "A", emailDestinatario: "" })).texto).toBe("Pronto para envio");

    expect(indicadorStatusItem(makeItem({ status: "AGUARDANDO_CORRECAO", clienteNome: "A", emailDestinatario: "" })).texto).toBe("Aguardando correção");

  });



  it("exibe sem e-mail apenas para AGUARDANDO_CORRECAO sem destinatário", () => {

    expect(exibirEmailItem(makeItem({ status: "AGUARDANDO_CORRECAO", emailDestinatario: "" })).texto).toBe("Sem e-mail");

    expect(exibirEmailItem(makeItem({ status: "PRONTO_PARA_ENVIO", emailDestinatario: "" })).texto).toBe("E-mail não encontrado");

  });



  it("identifica itens que precisam de confirmação", () => {

    expect(itemPrecisaConfirmacao(makeItem({ confiancaIdentificacao: "BAIXA" }))).toBe(false);

    expect(itemPrecisaConfirmacao(makeItem({ status: "AGUARDANDO_CORRECAO", confiancaIdentificacao: "ALTA" }))).toBe(true);

    expect(itemPrecisaConfirmacao(makeItem({ status: "PRONTO_PARA_ENVIO", confiancaIdentificacao: "ALTA" }))).toBe(false);

  });

});

