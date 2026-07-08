import { useCallback, useEffect, useRef, useState } from "react";
import {
  gerarBoletoSicoob,
  gerarPixSicoob,
  listarCobrancasSicoob,
  valorCentavosParaReais,
} from "@/lib/sicoobApi";
import { formatarData, formatarMoeda } from "@/lib/inadimplentesUtils";
import type { CobrancaSicoob, SicoobStatus } from "@/types/api";

type Props = {
  dividaId: string;
  /** Status compartilhado (carregado uma vez na página de honorários). */
  status: SicoobStatus | null;
  loadingStatus?: boolean;
  onErro?: (msg: string) => void;
  onSucesso?: (msg: string) => void;
};

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function statusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "PENDENTE") return "Pendente";
  if (s === "PAGO") return "Pago";
  if (s === "ERRO") return "Erro";
  if (s === "ESGOTADO") return "Esgotado";
  return status;
}

export default function SicoobCobrancaPanel({
  dividaId,
  status,
  loadingStatus = false,
  onErro,
  onSucesso,
}: Props) {
  const [cobrancas, setCobrancas] = useState<CobrancaSicoob[]>([]);
  const [emitida, setEmitida] = useState<CobrancaSicoob | null>(null);
  const [loadingLista, setLoadingLista] = useState(false);
  const [emitindo, setEmitindo] = useState<"pix" | "boleto" | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const onErroRef = useRef(onErro);
  const onSucessoRef = useRef(onSucesso);
  onErroRef.current = onErro;
  onSucessoRef.current = onSucesso;

  const carregarCobrancas = useCallback(async () => {
    if (!dividaId) return;
    setLoadingLista(true);
    try {
      const list = await listarCobrancasSicoob(dividaId);
      setCobrancas(list);
    } catch (e: unknown) {
      onErroRef.current?.(e instanceof Error ? e.message : "Falha ao listar cobranças Sicoob");
    } finally {
      setLoadingLista(false);
    }
  }, [dividaId]);

  useEffect(() => {
    void carregarCobrancas();
  }, [carregarCobrancas]);

  async function handleGerarPix() {
    setEmitindo("pix");
    try {
      const c = await gerarPixSicoob(dividaId);
      setEmitida(c);
      onSucessoRef.current?.(status?.mock ? "Pix gerado (simulação — modo mock)." : "Pix Sicoob gerado.");
      await carregarCobrancas();
    } catch (e: unknown) {
      onErroRef.current?.(e instanceof Error ? e.message : "Falha ao gerar Pix");
    } finally {
      setEmitindo(null);
    }
  }

  async function handleGerarBoleto() {
    setEmitindo("boleto");
    try {
      const c = await gerarBoletoSicoob(dividaId);
      setEmitida(c);
      onSucessoRef.current?.(status?.mock ? "Boleto gerado (simulação — modo mock)." : "Boleto Sicoob gerado.");
      await carregarCobrancas();
    } catch (e: unknown) {
      onErroRef.current?.(e instanceof Error ? e.message : "Falha ao gerar boleto");
    } finally {
      setEmitindo(null);
    }
  }

  async function handleCopiar(texto: string, chave: string) {
    const ok = await copiarTexto(texto);
    if (ok) {
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } else {
      onErroRef.current?.("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  const modoReal = status != null && !status.mock;
  const pixDisabled =
    emitindo !== null ||
    (modoReal && !status.pixChaveConfigured) ||
    status?.enabled === false;
  const boletoDisabled =
    emitindo !== null ||
    (modoReal && !status.contasBoletoConfigured) ||
    status?.enabled === false;

  return (
    <div className="sicoob-panel">
      <div className="sicoob-panel__banner" role="status">
        <div className="sicoob-panel__banner-topo">
          <strong className="sicoob-panel__titulo">Cobrança Sicoob</strong>
          <div className="sicoob-panel__badges">
            {loadingStatus ? (
              <span className="sicoob-panel__badge">Carregando…</span>
            ) : status == null ? (
              <span className="sicoob-panel__badge sicoob-panel__badge--alerta">Indisponível</span>
            ) : (
              <>
                {status.mock && (
                  <span className="sicoob-panel__badge sicoob-panel__badge--mock">
                    Simulação (modo mock)
                  </span>
                )}
                {!status.mock && status.configuredForApi && (
                  <span className="sicoob-panel__badge sicoob-panel__badge--ok">API real</span>
                )}
                {!status.mock && !status.configuredForApi && (
                  <span className="sicoob-panel__badge sicoob-panel__badge--alerta">Configuração incompleta</span>
                )}
                {!status.enabled && (
                  <span className="sicoob-panel__badge sicoob-panel__badge--alerta">Desabilitado</span>
                )}
              </>
            )}
          </div>
        </div>
        {status?.mensagem && <p className="sicoob-panel__mensagem">{status.mensagem}</p>}
        {modoReal && !status.pixChaveConfigured && (
          <p className="sicoob-panel__hint">Pix indisponível: chave Pix não configurada no backend.</p>
        )}
        {modoReal && !status.contasBoletoConfigured && (
          <p className="sicoob-panel__hint">Boleto indisponível: contas de boleto não configuradas no backend.</p>
        )}
      </div>

      <div className="sicoob-panel__acoes">
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={() => void handleGerarPix()}
          disabled={pixDisabled}
          title={
            modoReal && !status?.pixChaveConfigured
              ? "Chave Pix não configurada"
              : "Gerar cobrança Pix via Sicoob"
          }
        >
          {emitindo === "pix" ? "Gerando Pix…" : "Gerar Pix"}
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => void handleGerarBoleto()}
          disabled={boletoDisabled}
          title={
            modoReal && !status?.contasBoletoConfigured
              ? "Contas de boleto não configuradas"
              : "Gerar boleto via Sicoob"
          }
        >
          {emitindo === "boleto" ? "Gerando boleto…" : "Gerar boleto"}
        </button>
      </div>

      {emitida && (
        <div className="sicoob-panel__emitida">
          <p className="sicoob-panel__emitida-meta">
            {emitida.tipo === "PIX" ? "Pix" : "Boleto"} · {statusLabel(emitida.status)} ·{" "}
            {formatarMoeda(valorCentavosParaReais(emitida.valorCentavos))}
          </p>

          {emitida.tipo === "PIX" && emitida.pixCopiaECola && (
            <div className="sicoob-panel__campo">
              <label className="sicoob-panel__label">Pix copia e cola</label>
              <div className="sicoob-panel__campo-row">
                <code className="sicoob-panel__code">{emitida.pixCopiaECola}</code>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => void handleCopiar(emitida.pixCopiaECola!, "pix")}
                >
                  {copiado === "pix" ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {emitida.tipo === "BOLETO" && (
            <>
              {emitida.boletoLinhaDigitavel && (
                <div className="sicoob-panel__campo">
                  <label className="sicoob-panel__label">Linha digitável</label>
                  <div className="sicoob-panel__campo-row">
                    <code className="sicoob-panel__code">{emitida.boletoLinhaDigitavel}</code>
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => void handleCopiar(emitida.boletoLinhaDigitavel!, "linha")}
                    >
                      {copiado === "linha" ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              {emitida.boletoCodigoBarras && (
                <div className="sicoob-panel__campo">
                  <label className="sicoob-panel__label">Código de barras</label>
                  <div className="sicoob-panel__campo-row">
                    <code className="sicoob-panel__code">{emitida.boletoCodigoBarras}</code>
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => void handleCopiar(emitida.boletoCodigoBarras!, "barras")}
                    >
                      {copiado === "barras" ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {emitida.mensagemErro && (
            <p className="sicoob-panel__erro-item">{emitida.mensagemErro}</p>
          )}
        </div>
      )}

      <div className="sicoob-panel__lista">
        <h4 className="sicoob-panel__lista-titulo">Cobranças Sicoob desta dívida</h4>
        {loadingLista ? (
          <p className="sicoob-panel__vazio">Carregando cobranças…</p>
        ) : cobrancas.length === 0 ? (
          <p className="sicoob-panel__vazio">Nenhuma cobrança Sicoob emitida ainda.</p>
        ) : (
          <ul className="sicoob-panel__ul">
            {cobrancas.map((c) => (
              <li key={c.cobrancaId || `${c.tipo}-${c.criadoEm}`} className="sicoob-panel__li">
                <span className="sicoob-panel__li-tipo">{c.tipo}</span>
                <span className={`sicoob-panel__li-status sicoob-panel__li-status--${c.status.toLowerCase()}`}>
                  {statusLabel(c.status)}
                </span>
                <span className="sicoob-panel__li-valor">
                  {formatarMoeda(valorCentavosParaReais(c.valorCentavos))}
                </span>
                <span className="sicoob-panel__li-data">{c.criadoEm ? formatarData(c.criadoEm) : "—"}</span>
                {c.mensagemErro && <span className="sicoob-panel__li-erro">{c.mensagemErro}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
