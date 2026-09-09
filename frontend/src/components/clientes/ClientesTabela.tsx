import type { Dispatch, SetStateAction } from "react";
import { EditIcon, SortIcon, TrashIcon } from "@/components/clientes/ClientesIcons";
import AdminItemCard from "@/components/ui/AdminItemCard";
import ResponsiveList from "@/components/ui/ResponsiveList";
import { STATUS_CLIENTE } from "@/lib/constants/status";
import { formatCelular, formatCpf, type FiltroSituacaoCliente } from "@/hooks/clientesTypes";
import type { Cliente } from "@/types/api";

type ClientesTabelaProps = {
  loading: boolean;
  ordenados: Cliente[];
  itensPagina: Cliente[];
  filtroSituacao: FiltroSituacaoCliente;
  podeExcluirCliente: boolean;
  itensPorPagina: number;
  paginaAtual: number;
  totalPaginas: number;
  setPagina: Dispatch<SetStateAction<number>>;
  toggleOrdenacao: (campo: "codigo" | "nome" | "cpf") => void;
  abrirModalEditar: (c: Cliente) => void;
  setClienteParaExcluir: Dispatch<SetStateAction<Cliente | null>>;
};

export default function ClientesTabela({
  loading,
  ordenados,
  itensPagina,
  filtroSituacao,
  podeExcluirCliente,
  itensPorPagina,
  paginaAtual,
  totalPaginas,
  setPagina,
  toggleOrdenacao,
  abrirModalEditar,
  setClienteParaExcluir,
}: ClientesTabelaProps) {
  return (
    <>
      <ResponsiveList
        desktop={
          <div className="page-clientes__tabela-wrap">
            <table className="page-clientes__tabela">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="page-clientes__th"
                      onClick={() => toggleOrdenacao("codigo")}
                    >
                      Código <SortIcon />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="page-clientes__th"
                      onClick={() => toggleOrdenacao("nome")}
                    >
                      Nome <SortIcon />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="page-clientes__th"
                      onClick={() => toggleOrdenacao("cpf")}
                    >
                      CPF/CNPJ <SortIcon />
                    </button>
                  </th>
                  <th>Celular</th>
                  <th>E-mail</th>
                  <th className="page-clientes__th-acao">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="page-clientes__loading">
                      Carregando...
                    </td>
                  </tr>
                ) : ordenados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="page-clientes__vazio">
                      {filtroSituacao === STATUS_CLIENTE.INATIVO
                        ? "Nenhum cliente inativo encontrado."
                        : "Nenhum cliente ativo encontrado."}
                    </td>
                  </tr>
                ) : (
                  itensPagina.map((c) => (
                    <tr key={c.id ?? `${c.codigo ?? ""}-${c.nome}-${c.cpf ?? ""}`}>
                      <td>{c.codigo?.trim() ? c.codigo : "—"}</td>
                      <td>{c.nome}</td>
                      <td>{formatCpf(c.cpf)}</td>
                      <td>{formatCelular(c.celular)}</td>
                      <td>{c.email?.trim() ? c.email : "—"}</td>
                      <td>
                        <div className="page-clientes__acoes">
                          <button
                            type="button"
                            className="page-clientes__acao page-clientes__acao--editar"
                            onClick={() => abrirModalEditar(c)}
                            title="Editar cliente"
                            aria-label="Editar cliente"
                          >
                            <EditIcon />
                          </button>
                          {podeExcluirCliente && (
                            <button
                              type="button"
                              className="page-clientes__acao page-clientes__acao--excluir"
                              onClick={() => setClienteParaExcluir(c)}
                              title="Excluir cliente"
                              aria-label="Excluir cliente"
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          loading ? (
            <p className="page-clientes__vazio">Carregando...</p>
          ) : ordenados.length === 0 ? (
            <p className="page-clientes__vazio">
              {filtroSituacao === STATUS_CLIENTE.INATIVO
                ? "Nenhum cliente inativo encontrado."
                : "Nenhum cliente ativo encontrado."}
            </p>
          ) : (
            <ul className="admin-item-list">
              {itensPagina.map((c) => (
                <li key={c.id ?? `${c.codigo ?? ""}-${c.nome}-${c.cpf ?? ""}`}>
                  <AdminItemCard
                    title={c.nome}
                    meta={c.codigo?.trim() ? `Código ${c.codigo}` : undefined}
                    fields={[
                      { label: "CPF/CNPJ", value: formatCpf(c.cpf) },
                      { label: "Celular", value: formatCelular(c.celular) },
                      { label: "E-mail", value: c.email?.trim() ? c.email : "—" },
                    ]}
                    actions={
                      <>
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          onClick={() => abrirModalEditar(c)}
                        >
                          Editar
                        </button>
                        {podeExcluirCliente && (
                          <button
                            type="button"
                            className="btn btn--danger btn--small"
                            onClick={() => setClienteParaExcluir(c)}
                          >
                            Excluir
                          </button>
                        )}
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )
        }
      />

      {ordenados.length > itensPorPagina && (
        <div className="page-clientes__paginacao">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="page-clientes__paginacao-info">
            Página {paginaAtual} de {totalPaginas} ({ordenados.length} cliente
            {ordenados.length !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
}
