import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { Cliente, ItemEnvioBoleto } from "@/types/api";

type CorrigirItemModalProps = {
  itemCorrigir: ItemEnvioBoleto;
  buscaCliente: string;
  setBuscaCliente: (valor: string) => void;
  carregarClientes: (termo?: string) => void;
  loadingClientes: boolean;
  clientesFiltrados: Cliente[];
  clienteSelecionadoId: string;
  setClienteSelecionadoId: (id: string) => void;
  setItemCorrigir: (item: ItemEnvioBoleto | null) => void;
  loading: boolean;
  salvarClienteCorrigido: () => void;
};

export default function CorrigirItemModal({
  itemCorrigir,
  buscaCliente,
  setBuscaCliente,
  carregarClientes,
  loadingClientes,
  clientesFiltrados,
  clienteSelecionadoId,
  setClienteSelecionadoId,
  setItemCorrigir,
  loading,
  salvarClienteCorrigido,
}: CorrigirItemModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={() => setItemCorrigir(null)}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cliente-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-cliente-titulo" className="modal__titulo">
          Corrigir cliente
        </h2>
        <p className="page-envio-boletos__modal-arquivo">
          Arquivo: {itemCorrigir.nomeArquivoOriginal}
        </p>
        <input
          type="text"
          className="page-envio-boletos__input page-envio-boletos__input--full"
          placeholder="Buscar cliente por nome, código ou CPF/CNPJ..."
          value={buscaCliente}
          onChange={(e) => {
            setBuscaCliente(e.target.value);
            carregarClientes(e.target.value);
          }}
        />
        <div className="page-envio-boletos__lista-clientes">
          {loadingClientes ? (
            <p>Carregando clientes...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p>Nenhum cliente encontrado.</p>
          ) : (
            clientesFiltrados.map((c) => (
              <label key={c.id} className="page-envio-boletos__cliente-opcao">
                <input
                  type="radio"
                  name="cliente-correcao"
                  value={c.id}
                  checked={clienteSelecionadoId === c.id}
                  onChange={() => setClienteSelecionadoId(c.id ?? "")}
                />
                <span>
                  <strong>{c.nome}</strong>
                  {c.codigo ? ` · ${c.codigo}` : ""}
                  {c.cpf ? ` · ${c.cpf}` : ""}
                </span>
              </label>
            ))
          )}
        </div>
        <div className="modal__acoes">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setItemCorrigir(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading || !clienteSelecionadoId}
            onClick={salvarClienteCorrigido}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
