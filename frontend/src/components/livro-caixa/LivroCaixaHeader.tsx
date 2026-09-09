type LivroCaixaHeaderProps = {
  onAbrirCadastros: () => void;
  onNovaMovimentacao: () => void;
};

export default function LivroCaixaHeader({
  onAbrirCadastros,
  onNovaMovimentacao,
}: LivroCaixaHeaderProps) {
  return (
    <header className="livro-caixa__head">
      <div>
        <p className="livro-caixa__contexto">Sistema de Gestão de Inadimplentes</p>
        <h1 className="livro-caixa__titulo">Livro Caixa</h1>
        <p className="livro-caixa__subtitulo">
          Controle financeiro com saldo realizado, previsto e movimentações.
        </p>
      </div>
      <div className="livro-caixa__head-acoes">
        <button type="button" className="btn btn--secondary" onClick={onAbrirCadastros}>
          Categorias e contas
        </button>
        <button type="button" className="btn btn--primary" onClick={onNovaMovimentacao}>
          + Nova movimentação
        </button>
      </div>
    </header>
  );
}
