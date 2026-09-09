import type { Dispatch, SetStateAction } from "react";
import type { AbaLivroCaixa } from "@/hooks/livroCaixaTypes";
import { STATUS_MOVIMENTACAO, TIPO_MOVIMENTACAO } from "@/lib/constants/status";
import {
  FORMAS_PAGAMENTO,
  PERIODOS_RAPIDOS,
  labelFormaPagamento,
  type FiltroRapidoMovimentacao,
  type PeriodoRapido,
} from "@/lib/livroCaixaUtils";
import type {
  CategoriaLivroCaixa,
  ContaLivroCaixa,
  FormaPagamento,
  StatusMovimentacao,
  TipoMovimentacao,
} from "@/types/livroCaixa";

type LivroCaixaFiltrosProps = {
  periodoRapido: PeriodoRapido;
  aplicarPeriodoRapido: (id: PeriodoRapido) => void;
  dataInicio: string;
  setDataInicio: Dispatch<SetStateAction<string>>;
  dataFim: string;
  setDataFim: Dispatch<SetStateAction<string>>;
  setPagina: Dispatch<SetStateAction<number>>;
  carregarLista: () => void;
  aba: AbaLivroCaixa;
  setAba: Dispatch<SetStateAction<AbaLivroCaixa>>;
  filtroRapido: FiltroRapidoMovimentacao;
  aplicarFiltroRapido: (f: FiltroRapidoMovimentacao) => void;
  mostrarFiltrosAvancados: boolean;
  setMostrarFiltrosAvancados: Dispatch<SetStateAction<boolean>>;
  tipoFiltro: TipoMovimentacao | "";
  setTipoFiltro: Dispatch<SetStateAction<TipoMovimentacao | "">>;
  setFiltroRapido: Dispatch<SetStateAction<FiltroRapidoMovimentacao>>;
  statusFiltro: StatusMovimentacao | "";
  setStatusFiltro: Dispatch<SetStateAction<StatusMovimentacao | "">>;
  categoriaFiltro: string;
  setCategoriaFiltro: Dispatch<SetStateAction<string>>;
  categorias: CategoriaLivroCaixa[];
  contaFiltro: string;
  setContaFiltro: Dispatch<SetStateAction<string>>;
  contas: ContaLivroCaixa[];
  formaFiltro: FormaPagamento | "";
  setFormaFiltro: Dispatch<SetStateAction<FormaPagamento | "">>;
  busca: string;
  setBusca: Dispatch<SetStateAction<string>>;
};

export default function LivroCaixaFiltros({
  periodoRapido,
  aplicarPeriodoRapido,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  setPagina,
  carregarLista,
  aba,
  setAba,
  filtroRapido,
  aplicarFiltroRapido,
  mostrarFiltrosAvancados,
  setMostrarFiltrosAvancados,
  tipoFiltro,
  setTipoFiltro,
  setFiltroRapido,
  statusFiltro,
  setStatusFiltro,
  categoriaFiltro,
  setCategoriaFiltro,
  categorias,
  contaFiltro,
  setContaFiltro,
  contas,
  formaFiltro,
  setFormaFiltro,
  busca,
  setBusca,
}: LivroCaixaFiltrosProps) {
  return (
    <>
      <div className="livro-caixa__periodos">
        {PERIODOS_RAPIDOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`dash-pill${periodoRapido === p.id ? " dash-pill--active" : ""}`}
            onClick={() => aplicarPeriodoRapido(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodoRapido === "PERSONALIZADO" && (
        <div className="livro-caixa__periodo-custom">
          <label>
            De
            <input
              type="date"
              className="modal__input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              className="modal__input"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setPagina(0);
              void carregarLista();
            }}
          >
            Aplicar
          </button>
        </div>
      )}

      <div className="livro-caixa__abas">
        {(["movimentacoes", "analise", "relatorio"] as AbaLivroCaixa[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`livro-caixa__aba${aba === id ? " livro-caixa__aba--ativa" : ""}`}
            onClick={() => setAba(id)}
          >
            {id === "movimentacoes" ? "Movimentações" : id === "analise" ? "Análise" : "Relatório"}
          </button>
        ))}
      </div>

      {aba === "movimentacoes" && (
        <>
          <div className="livro-caixa__filtros-rapidos">
            <button
              type="button"
              className={`livro-caixa__chip${filtroRapido === "A_PAGAR" ? " livro-caixa__chip--ativa" : ""}`}
              onClick={() => aplicarFiltroRapido("A_PAGAR")}
            >
              A pagar
            </button>
            <button
              type="button"
              className={`livro-caixa__chip${filtroRapido === "A_RECEBER" ? " livro-caixa__chip--ativa" : ""}`}
              onClick={() => aplicarFiltroRapido("A_RECEBER")}
            >
              A receber
            </button>
            <button
              type="button"
              className="btn btn--link"
              onClick={() => setMostrarFiltrosAvancados((v) => !v)}
            >
              {mostrarFiltrosAvancados ? "Ocultar filtros" : "Mais filtros"}
            </button>
          </div>

          {mostrarFiltrosAvancados && (
            <div className="livro-caixa__filtros-avancados">
              <select
                className="modal__input"
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as TipoMovimentacao | "");
                  setFiltroRapido("");
                  setPagina(0);
                }}
              >
                <option value="">Tipo</option>
                <option value={TIPO_MOVIMENTACAO.ENTRADA}>Entrada</option>
                <option value={TIPO_MOVIMENTACAO.SAIDA}>Saída</option>
              </select>
              <select
                className="modal__input"
                value={statusFiltro}
                onChange={(e) => {
                  setStatusFiltro(e.target.value as StatusMovimentacao | "");
                  setFiltroRapido("");
                  setPagina(0);
                }}
              >
                <option value="">Status</option>
                <option value={STATUS_MOVIMENTACAO.PREVISTO}>Previsto</option>
                <option value={STATUS_MOVIMENTACAO.RECEBIDO}>Recebido</option>
                <option value={STATUS_MOVIMENTACAO.PAGO}>Pago</option>
                <option value={STATUS_MOVIMENTACAO.CANCELADO}>Cancelado</option>
              </select>
              <select
                className="modal__input"
                value={categoriaFiltro}
                onChange={(e) => {
                  setCategoriaFiltro(e.target.value);
                  setPagina(0);
                }}
              >
                <option value="">Categoria</option>
                {categorias
                  .filter((c) => c.ativa)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
              <select
                className="modal__input"
                value={contaFiltro}
                onChange={(e) => {
                  setContaFiltro(e.target.value);
                  setPagina(0);
                }}
              >
                <option value="">Conta</option>
                {contas
                  .filter((c) => c.ativa)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
              <select
                className="modal__input"
                value={formaFiltro}
                onChange={(e) => {
                  setFormaFiltro(e.target.value as FormaPagamento | "");
                  setPagina(0);
                }}
              >
                <option value="">Forma pagamento</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {labelFormaPagamento(f)}
                  </option>
                ))}
              </select>
              <input
                className="modal__input"
                placeholder="Buscar descrição…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPagina(0)}
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void carregarLista()}
              >
                Filtrar
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
