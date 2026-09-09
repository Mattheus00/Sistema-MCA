import type { Dispatch, SetStateAction } from "react";
import { SearchIcon } from "@/components/clientes/ClientesIcons";
import { STATUS_CLIENTE } from "@/lib/constants/status";
import type { FiltroSituacaoCliente } from "@/hooks/clientesTypes";

type ClientesFiltrosProps = {
  busca: string;
  setBusca: Dispatch<SetStateAction<string>>;
  filtroSituacao: FiltroSituacaoCliente;
  setFiltroSituacao: Dispatch<SetStateAction<FiltroSituacaoCliente>>;
  setPagina: Dispatch<SetStateAction<number>>;
};

export default function ClientesFiltros({
  busca,
  setBusca,
  filtroSituacao,
  setFiltroSituacao,
  setPagina,
}: ClientesFiltrosProps) {
  return (
    <div className="page-clientes__filtros">
      <div className="page-clientes__busca">
        <SearchIcon />
        <input
          type="text"
          placeholder="Buscar por código, nome ou CPF/CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="page-clientes__input"
        />
      </div>
      <div
        className="page-clientes__filtro-grupo"
        role="group"
        aria-label="Filtrar por situação do cliente"
      >
        {(
          [
            { valor: STATUS_CLIENTE.ATIVO, rotulo: "Ativos" },
            { valor: STATUS_CLIENTE.INATIVO, rotulo: "Inativos" },
          ] as const
        ).map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            className={`page-clientes__filtro ${filtroSituacao === valor ? "page-clientes__filtro--ativo" : ""}`}
            aria-pressed={filtroSituacao === valor}
            onClick={() => {
              setFiltroSituacao(valor);
              setPagina(1);
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
