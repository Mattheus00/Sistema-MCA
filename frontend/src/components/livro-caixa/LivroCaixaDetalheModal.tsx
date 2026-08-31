import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  baixarAnexoMovimentacao,
  cancelarMovimentacao,
  enviarAnexoMovimentacao,
  pagarMovimentacao,
  receberMovimentacao,
} from "@/lib/livroCaixaApi";
import {
  FORMAS_PAGAMENTO,
  classeBadgeStatus,
  classeValorMovimentacao,
  formatarDataLivroCaixa,
  formatarTamanhoArquivo,
  formatarValorMovimentacao,
  hojeIso,
  labelFormaPagamento,
  labelOrigemMovimentacao,
  labelStatusMovimentacao,
  labelTipoMovimentacao,
} from "@/lib/livroCaixaUtils";
import type { ContaLivroCaixa, FormaPagamento, MovimentacaoDetalhe } from "@/types/livroCaixa";

type LivroCaixaDetalheModalProps = {
  movimentacao: MovimentacaoDetalhe | null;
  contas: ContaLivroCaixa[];
  carregando: boolean;
  onFechar: () => void;
  onAtualizado: (m: MovimentacaoDetalhe) => void;
  onEditar: (m: MovimentacaoDetalhe) => void;
};

export default function LivroCaixaDetalheModal({
  movimentacao,
  contas,
  carregando,
  onFechar,
  onAtualizado,
  onEditar,
}: LivroCaixaDetalheModalProps) {
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarReceberPagar, setMostrarReceberPagar] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | "">("");
  const [contaId, setContaId] = useState("");
  const inputAnexo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!movimentacao) return;
    document.body.style.overflow = "hidden";
    setErro(null);
    setMostrarReceberPagar(false);
    setDataPagamento(hojeIso());
    setFormaPagamento(movimentacao.formaPagamento ?? "");
    setContaId(movimentacao.contaId ?? "");
    return () => {
      document.body.style.overflow = "";
    };
  }, [movimentacao]);

  if (!movimentacao) return null;

  const podeReceber = movimentacao.tipo === "ENTRADA" && movimentacao.status === "PREVISTO";
  const podePagar = movimentacao.tipo === "SAIDA" && movimentacao.status === "PREVISTO";
  const podeCancelar = movimentacao.status === "PREVISTO";

  async function executarReceberPagar() {
    if (!movimentacao) return;
    setAcaoLoading(true);
    setErro(null);
    try {
      const payload = {
        dataPagamento,
        ...(formaPagamento ? { formaPagamento } : {}),
        ...(contaId ? { contaId } : {}),
      };
      const atualizado =
        movimentacao.tipo === "ENTRADA"
          ? await receberMovimentacao(movimentacao.id, payload)
          : await pagarMovimentacao(movimentacao.id, payload);
      onAtualizado(atualizado);
      setMostrarReceberPagar(false);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
    } finally {
      setAcaoLoading(false);
    }
  }

  async function executarCancelar() {
    if (!movimentacao || !window.confirm("Cancelar esta movimentação?")) return;
    setAcaoLoading(true);
    setErro(null);
    try {
      const atualizado = await cancelarMovimentacao(movimentacao.id);
      onAtualizado(atualizado);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setAcaoLoading(false);
    }
  }

  async function handleAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !movimentacao) return;
    setAcaoLoading(true);
    setErro(null);
    try {
      const atualizado = await enviarAnexoMovimentacao(movimentacao.id, file);
      onAtualizado(atualizado);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar anexo.");
    } finally {
      setAcaoLoading(false);
      if (inputAnexo.current) inputAnexo.current.value = "";
    }
  }

  const modal = (
    <div className="modal-overlay" onClick={() => !acaoLoading && onFechar()}>
      <div className="modal modal--cadastro livro-caixa__modal-detalhe" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="livro-caixa__detalhe-head">
          <div>
            <p className="livro-caixa__detalhe-tipo">{labelTipoMovimentacao(movimentacao.tipo)}</p>
            <h2 className="modal__titulo">{movimentacao.descricao}</h2>
            <p className={`livro-caixa__detalhe-valor ${classeValorMovimentacao(movimentacao.tipo)}`}>
              {formatarValorMovimentacao(movimentacao.tipo, movimentacao.valor)}
            </p>
          </div>
          <span className={classeBadgeStatus(movimentacao.status)}>{labelStatusMovimentacao(movimentacao.status)}</span>
        </div>

        {carregando && <p className="livro-caixa__loading-inline">Atualizando…</p>}
        {erro && (
          <p className="livro-caixa__erro-inline" role="alert">
            {erro}
          </p>
        )}

        {(movimentacao.vencido || movimentacao.proximoVencimento) && (
          <p className={`livro-caixa__alerta${movimentacao.vencido ? " livro-caixa__alerta--vencido" : ""}`} role="status">
            {movimentacao.vencido ? "Vencido" : "Vencimento próximo"}
            {movimentacao.dataVencimento ? ` · ${formatarDataLivroCaixa(movimentacao.dataVencimento)}` : ""}
          </p>
        )}

        <dl className="livro-caixa__detalhe-grid">
          <div>
            <dt>Categoria</dt>
            <dd>{movimentacao.categoriaNome ?? "—"}</dd>
          </div>
          <div>
            <dt>Data movimentação</dt>
            <dd>{formatarDataLivroCaixa(movimentacao.dataMovimentacao)}</dd>
          </div>
          <div>
            <dt>Vencimento</dt>
            <dd>{formatarDataLivroCaixa(movimentacao.dataVencimento)}</dd>
          </div>
          <div>
            <dt>Pagamento/recebimento</dt>
            <dd>{formatarDataLivroCaixa(movimentacao.dataPagamento)}</dd>
          </div>
          <div>
            <dt>Forma</dt>
            <dd>{labelFormaPagamento(movimentacao.formaPagamento)}</dd>
          </div>
          <div>
            <dt>Conta</dt>
            <dd>{movimentacao.contaNome ?? "—"}</dd>
          </div>
          {movimentacao.clienteNome && (
            <div>
              <dt>Cliente</dt>
              <dd>{movimentacao.clienteNome}</dd>
            </div>
          )}
          {movimentacao.fornecedor && (
            <div>
              <dt>Fornecedor</dt>
              <dd>{movimentacao.fornecedor}</dd>
            </div>
          )}
          <div>
            <dt>Origem</dt>
            <dd>{labelOrigemMovimentacao(movimentacao.origem)}</dd>
          </div>
          {movimentacao.observacao && (
            <div className="livro-caixa__detalhe-full">
              <dt>Observação</dt>
              <dd>{movimentacao.observacao}</dd>
            </div>
          )}
        </dl>

        <section className="livro-caixa__secao">
          <div className="livro-caixa__secao-head">
            <h3>Anexos</h3>
            <label className="btn btn--secondary btn--sm">
              Enviar arquivo
              <input ref={inputAnexo} type="file" hidden onChange={(e) => void handleAnexo(e)} />
            </label>
          </div>
          {movimentacao.anexos.length === 0 ? (
            <p className="livro-caixa__vazio">Nenhum anexo.</p>
          ) : (
            <ul className="livro-caixa__anexos">
              {movimentacao.anexos.map((a) => (
                <li key={a.id}>
                  <span>{a.nomeArquivo}</span>
                  <span className="livro-caixa__anexo-meta">{formatarTamanhoArquivo(a.tamanhoBytes)}</span>
                  <button
                    type="button"
                    className="btn btn--link"
                    onClick={() => void baixarAnexoMovimentacao(movimentacao.id, a.id, a.nomeArquivo)}
                  >
                    Baixar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {movimentacao.historico.length > 0 && (
          <section className="livro-caixa__secao">
            <h3>Histórico</h3>
            <ul className="livro-caixa__historico">
              {movimentacao.historico.map((h, i) => (
                <li key={h.id ?? i}>
                  <time>{formatarDataLivroCaixa(h.dataHora)}</time>
                  <strong>{h.acao}</strong>
                  {h.usuario && <span>{h.usuario}</span>}
                  {h.detalhes && <p>{h.detalhes}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {mostrarReceberPagar && (podeReceber || podePagar) && (
          <div className="livro-caixa__receber-pagar">
            <h3>{movimentacao.tipo === "ENTRADA" ? "Registrar recebimento" : "Registrar pagamento"}</h3>
            <div className="modal__grid">
              <label className="modal__campo">
                <span className="modal__label">Data *</span>
                <input type="date" className="modal__input" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </label>
              <label className="modal__campo">
                <span className="modal__label">Forma</span>
                <select className="modal__input" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento | "")}>
                  <option value="">—</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {labelFormaPagamento(f)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal__campo">
                <span className="modal__label">Conta</span>
                <select className="modal__input" value={contaId} onChange={(e) => setContaId(e.target.value)}>
                  <option value="">—</option>
                  {contas.filter((c) => c.ativa).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal__botoes modal__botoes--inline">
              <button type="button" className="btn btn--secondary" onClick={() => setMostrarReceberPagar(false)} disabled={acaoLoading}>
                Voltar
              </button>
              <button type="button" className="btn btn--primary" onClick={() => void executarReceberPagar()} disabled={acaoLoading}>
                Confirmar
              </button>
            </div>
          </div>
        )}

        <div className="modal__botoes">
          <button type="button" className="btn btn--secondary" onClick={onFechar} disabled={acaoLoading}>
            Fechar
          </button>
          {movimentacao.editavel && (
            <button type="button" className="btn btn--secondary" onClick={() => onEditar(movimentacao)} disabled={acaoLoading}>
              Editar
            </button>
          )}
          {podeCancelar && (
            <button type="button" className="btn btn--secondary" onClick={() => void executarCancelar()} disabled={acaoLoading}>
              Cancelar movimentação
            </button>
          )}
          {(podeReceber || podePagar) && !mostrarReceberPagar && (
            <button type="button" className="btn btn--primary" onClick={() => setMostrarReceberPagar(true)} disabled={acaoLoading}>
              {movimentacao.tipo === "ENTRADA" ? "Receber" : "Pagar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
