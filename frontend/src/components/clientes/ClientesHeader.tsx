import { DownloadIcon, PlusIcon } from "@/components/clientes/ClientesIcons";

type ClientesHeaderProps = {
  loading: boolean;
  gerarRelatorioExcel: () => void;
  abrirModalNovo: () => void;
};

export default function ClientesHeader({
  loading,
  gerarRelatorioExcel,
  abrirModalNovo,
}: ClientesHeaderProps) {
  return (
    <header className="page-clientes__header">
      <h1 className="page-clientes__title">Listagem de Clientes</h1>
      <div className="page-clientes__header-acoes">
        <button
          type="button"
          className="btn btn--primary"
          onClick={gerarRelatorioExcel}
          disabled={loading}
          title="Exportar listagem de clientes para Excel"
        >
          <DownloadIcon />
          Gerar relatório
        </button>
        <button type="button" className="btn btn--primary" onClick={abrirModalNovo}>
          <PlusIcon />
          Novo Cliente
        </button>
      </div>
    </header>
  );
}
