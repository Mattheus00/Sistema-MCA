import type { Inadimplencia } from "@/types/api";
import { formatarData, formatarMesAno, formatarMoeda, saldoDevedorItem } from "@/lib/inadimplentesUtils";
import {
  buildPixQrCodeImageUrl,
  getPixCobrancaInfo,
} from "@/lib/mailtoCobranca";

export const EMPRESA_COBRANCA = {
  telefone: "(31) 99823-1343",
  email: "financeiro@contabilidademca.com.br",
  endereco: "Conceição do Mato Dentro - MG",
  nome: "Contabilidade São Judas Tadeu",
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarDataGeracao(d = new Date()): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Baixa o QR Code Pix como data URL para uso no html2canvas (evita CORS).
 */
export async function fetchPixQrCodeDataUrl(size = 280): Promise<string> {
  const pix = getPixCobrancaInfo();
  const url = buildPixQrCodeImageUrl(pix.pixCopiaECola, size);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`QR HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Falha ao ler QR Code"));
      reader.readAsDataURL(blob);
    });
  } catch {
    // fallback: URL remota (pode falhar no canvas por CORS)
    return url;
  }
}

export type AvisoPendenciaHtmlOptions = {
  /** Uma ou mais dívidas a incluir no aviso */
  itens: Inadimplencia[];
  nomeCliente: string;
  /** Data URL do QR Code Pix (preferível). Se omitido, usa URL remota. */
  qrCodeSrc?: string;
};

/**
 * Monta o HTML institucional do aviso de pendência financeira (A4).
 * Aceita um ou vários períodos (tabela com N linhas + total consolidado).
 */
export function buildAvisoPendenciaHtml(opts: AvisoPendenciaHtmlOptions): string {
  const { itens, nomeCliente, qrCodeSrc } = opts;
  if (!itens.length) {
    throw new Error("Informe ao menos uma dívida para o aviso de pendência.");
  }

  const pix = getPixCobrancaInfo();
  const ordenados = [...itens].sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));
  const totalNumerico = ordenados.reduce((s, i) => s + saldoDevedorItem(i), 0);
  const valorTotal = formatarMoeda(totalNumerico);
  const vencimentoMaisAntigo = formatarData(ordenados[0].vencimento);
  const qtdPeriodos = ordenados.length;
  const referenciaResumo =
    qtdPeriodos === 1
      ? formatarMesAno(ordenados[0].vencimento)
      : `${qtdPeriodos} períodos`;
  const dataGeracao = formatarDataGeracao();
  const qrSrc = qrCodeSrc || buildPixQrCodeImageUrl(pix.pixCopiaECola, 280);

  const linhasTabela = ordenados
    .map((item) => {
      const descricao = (item.descricao || "").trim() || "Honorários / serviços contábeis";
      const referencia = formatarMesAno(item.vencimento);
      const vencimento = formatarData(item.vencimento);
      const valor = formatarMoeda(saldoDevedorItem(item));
      return `<tr data-pdf-block>
              <td>${escapeHtml(descricao)}</td>
              <td>${escapeHtml(referencia)}</td>
              <td>${escapeHtml(vencimento)}</td>
              <td>${escapeHtml(valor)}</td>
            </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aviso de Pendência Financeira</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --roxo-principal: #9f2d98;
      --roxo-escuro: #48145c;
      --roxo-claro: #f7eff8;
      --texto-principal: #302d35;
      --texto-secundario: #77727d;
      --borda: #e9dfea;
      --fundo: #f7f5f8;
      --branco: #ffffff;
    }
    body {
      background: var(--fundo);
      color: var(--texto-principal);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding: 0;
      margin: 0;
    }
    .documento {
      width: 794px;
      margin: 0 auto;
      background: var(--branco);
      overflow: visible;
    }
    /* Blocos atômicos: o gerador de PDF evita cortar no meio deles */
    [data-pdf-block] { break-inside: avoid; page-break-inside: avoid; }
    .cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 28px;
      border-bottom: 1px solid var(--borda);
    }
    .marca-superior {
      color: var(--roxo-principal);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .nome-empresa {
      color: var(--texto-principal);
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      margin-top: 4px;
    }
    .cabecalho-contato {
      color: var(--texto-secundario);
      font-size: 12px;
      text-align: right;
      line-height: 1.7;
    }
    .faixa {
      background: linear-gradient(135deg, var(--roxo-escuro), var(--roxo-principal));
      color: var(--branco);
      padding: 22px 28px;
    }
    .faixa-etiqueta {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      opacity: 0.85;
      text-transform: uppercase;
    }
    .faixa h1 { font-size: 22px; line-height: 1.25; margin-top: 6px; }
    .faixa p { font-size: 13px; margin-top: 6px; opacity: 0.9; }
    .conteudo { padding: 18px 28px 16px; }
    .saudacao { font-size: 14px; margin-bottom: 10px; }
    .mensagem { color: var(--texto-secundario); font-size: 12px; margin-bottom: 14px; line-height: 1.5; }
    .mensagem strong { color: var(--texto-principal); }
    .resumo {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .resumo-card {
      background: var(--roxo-claro);
      border: 1px solid var(--borda);
      border-radius: 10px;
      padding: 12px;
    }
    .resumo-titulo {
      color: var(--texto-secundario);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .resumo-valor {
      color: var(--roxo-escuro);
      font-size: 17px;
      font-weight: 700;
      margin-top: 5px;
    }
    .resumo-card.destaque {
      background: var(--roxo-principal);
      border-color: var(--roxo-principal);
    }
    .resumo-card.destaque .resumo-titulo,
    .resumo-card.destaque .resumo-valor { color: var(--branco); }
    .titulo-secao { color: var(--roxo-escuro); font-size: 15px; margin-bottom: 10px; }
    .tabela-container {
      border: 1px solid var(--borda);
      border-radius: 10px;
      margin-bottom: 18px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--roxo-claro); }
    th {
      color: var(--roxo-escuro);
      font-size: 11px;
      letter-spacing: 0.6px;
      padding: 10px 12px;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-top: 1px solid var(--borda);
      color: var(--texto-principal);
      padding: 9px 12px;
      vertical-align: top;
      font-size: 12px;
    }
    th:last-child, td:last-child { text-align: right; }
    tfoot td {
      background: #fcf9fc;
      color: var(--roxo-escuro);
      font-size: 13px;
      font-weight: 700;
    }
    .pagamento {
      background: #fbf8fc;
      border-left: 5px solid var(--roxo-principal);
      border-radius: 8px;
      margin-bottom: 14px;
      padding: 12px 14px;
    }
    .pagamento-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      margin-top: 10px;
    }
    .pagamento-item { color: var(--texto-secundario); font-size: 12px; }
    .pagamento-item strong {
      color: var(--texto-principal);
      display: block;
      font-size: 11px;
    }
    .pagamento-pix {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 14px;
      align-items: start;
      margin-top: 12px;
    }
    .pix-qr { text-align: center; }
    .pix-qr img {
      width: 110px; height: 110px;
      border: 1px solid var(--borda);
      border-radius: 8px;
      background: #fff;
      display: inline-block;
    }
    .pix-copia {
      font-size: 9px;
      color: var(--texto-secundario);
      word-break: break-all;
      text-align: left;
      line-height: 1.45;
    }
    .pix-copia strong {
      display: block;
      color: var(--texto-principal);
      margin-bottom: 4px;
      font-size: 12px;
    }
    .observacao {
      background: #f8f8f8;
      border-radius: 8px;
      color: var(--texto-secundario);
      font-size: 12px;
      margin-bottom: 12px;
      padding: 10px 12px;
    }
    .encerramento { color: var(--texto-secundario); font-size: 13px; }
    .assinatura { color: var(--texto-principal); font-weight: 700; margin-top: 10px; }
    .rodape {
      background: var(--roxo-escuro);
      color: var(--branco);
      font-size: 11px;
      padding: 12px 28px;
      text-align: center;
    }
    .rodape span { opacity: 0.85; }
  </style>
</head>
<body>
  <main class="documento">
    <header class="cabecalho" data-pdf-block>
      <div>
        <div class="marca-superior">Contabilidade</div>
        <div class="nome-empresa">São Judas Tadeu</div>
      </div>
      <div class="cabecalho-contato">
        <div>${escapeHtml(EMPRESA_COBRANCA.telefone)}</div>
        <div>${escapeHtml(EMPRESA_COBRANCA.email)}</div>
        <div>${escapeHtml(EMPRESA_COBRANCA.endereco)}</div>
      </div>
    </header>
    <section class="faixa" data-pdf-block>
      <div class="faixa-etiqueta">Comunicado financeiro</div>
      <h1>Aviso cordial de pendência</h1>
      <p>Documento emitido em ${escapeHtml(dataGeracao)}</p>
    </section>
    <section class="conteudo">
      <div data-pdf-block>
        <p class="saudacao">Olá, <strong>${escapeHtml(nomeCliente)}</strong>.</p>
        <p class="mensagem">
          Esperamos que esteja tudo bem. Identificamos em nosso sistema a
          existência de valor(es) pendente(s) referente(s) aos serviços descritos
          abaixo. Sabemos que imprevistos podem acontecer e, por isso,
          encaminhamos este comunicado apenas como um
          <strong>lembrete cordial</strong>.
          <br /><br />
          Caso o pagamento já tenha sido realizado, pedimos a gentileza de
          desconsiderar esta mensagem ou enviar o comprovante para que possamos
          atualizar nossos registros.
        </p>
      </div>
      <div class="resumo" data-pdf-block>
        <div class="resumo-card destaque">
          <div class="resumo-titulo">Valor pendente</div>
          <div class="resumo-valor">${escapeHtml(valorTotal)}</div>
        </div>
        <div class="resumo-card">
          <div class="resumo-titulo">${qtdPeriodos === 1 ? "Vencimento" : "1º vencimento"}</div>
          <div class="resumo-valor">${escapeHtml(vencimentoMaisAntigo)}</div>
        </div>
        <div class="resumo-card">
          <div class="resumo-titulo">Referência</div>
          <div class="resumo-valor">${escapeHtml(referenciaResumo)}</div>
        </div>
      </div>
      <h2 class="titulo-secao" data-pdf-block>Detalhamento dos valores</h2>
      <div class="tabela-container">
        <table>
          <thead>
            <tr data-pdf-block>
              <th>Descrição</th>
              <th>Referência</th>
              <th>Vencimento</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabela}
          </tbody>
          <tfoot>
            <tr data-pdf-block>
              <td colspan="3">Total pendente</td>
              <td>${escapeHtml(valorTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div data-pdf-block>
        <h2 class="titulo-secao">Informações para pagamento</h2>
        <div class="pagamento">
          <p>Para sua comodidade, o pagamento poderá ser realizado utilizando os dados abaixo:</p>
          <div class="pagamento-grid">
            <div class="pagamento-item"><strong>Chave PIX</strong>${escapeHtml(pix.chavePix)}</div>
            <div class="pagamento-item"><strong>Favorecido</strong>${escapeHtml(pix.favorecido)}</div>
            <div class="pagamento-item"><strong>Banco</strong>${escapeHtml(pix.banco)}</div>
            <div class="pagamento-item"><strong>Documento</strong>${escapeHtml(pix.documento)}</div>
          </div>
          <div class="pagamento-pix">
            <div class="pix-qr">
              <img src="${escapeHtml(qrSrc)}" alt="QR Code Pix" width="110" height="110" />
            </div>
            <div class="pix-copia">
              <strong>Pix Copia e Cola</strong>
              ${escapeHtml(pix.pixCopiaECola)}
            </div>
          </div>
        </div>
      </div>
      <div class="observacao" data-pdf-block>
        Caso necessite de uma nova data para pagamento, segunda via,
        esclarecimentos ou negociação, entre em contato conosco. Nossa equipe
        está à disposição para buscar a melhor solução.
      </div>
      <div class="encerramento" data-pdf-block>
        Agradecemos pela atenção e pela parceria de sempre.
        <div class="assinatura">Equipe Contabilidade São Judas Tadeu</div>
      </div>
    </section>
    <footer class="rodape" data-pdf-block>
      <span>${escapeHtml(EMPRESA_COBRANCA.telefone)} • ${escapeHtml(EMPRESA_COBRANCA.email)} • ${escapeHtml(EMPRESA_COBRANCA.endereco)}</span>
    </footer>
  </main>
</body>
</html>`;
}
