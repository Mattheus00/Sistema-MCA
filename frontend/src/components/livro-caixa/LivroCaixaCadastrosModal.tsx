import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  atualizarCategoria,
  atualizarConta,
  criarCategoria,
  criarConta,
  desativarCategoria,
  desativarConta,
} from "@/lib/livroCaixaApi";
import { labelTipoMovimentacao } from "@/lib/livroCaixaUtils";
import type { CategoriaLivroCaixa, ContaLivroCaixa, TipoMovimentacao } from "@/types/livroCaixa";

type LivroCaixaCadastrosModalProps = {
  aberto: boolean;
  categorias: CategoriaLivroCaixa[];
  contas: ContaLivroCaixa[];
  onFechar: () => void;
  onAtualizado: () => void;
};

export default function LivroCaixaCadastrosModal({
  aberto,
  categorias,
  contas,
  onFechar,
  onAtualizado,
}: LivroCaixaCadastrosModalProps) {
  const [aba, setAba] = useState<"categorias" | "contas">("categorias");
  const [nomeCat, setNomeCat] = useState("");
  const [tipoCat, setTipoCat] = useState<TipoMovimentacao>("SAIDA");
  const [nomeConta, setNomeConta] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editContaId, setEditContaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    setErro(null);
    setEditCatId(null);
    setEditContaId(null);
    setNomeCat("");
    setNomeConta("");
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  if (!aberto) return null;

  async function salvarCategoria() {
    if (!nomeCat.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editCatId) {
        await atualizarCategoria(editCatId, { nome: nomeCat.trim(), tipo: tipoCat });
      } else {
        await criarCategoria({ nome: nomeCat.trim(), tipo: tipoCat });
      }
      setNomeCat("");
      setEditCatId(null);
      onAtualizado();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConta() {
    if (!nomeConta.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      if (editContaId) {
        await atualizarConta(editContaId, { nome: nomeConta.trim() });
      } else {
        await criarConta({ nome: nomeConta.trim() });
      }
      setNomeConta("");
      setEditContaId(null);
      onAtualizado();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar conta.");
    } finally {
      setSalvando(false);
    }
  }

  async function desativarCat(id: string) {
    if (!window.confirm("Desativar esta categoria?")) return;
    setSalvando(true);
    try {
      await desativarCategoria(id);
      onAtualizado();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    } finally {
      setSalvando(false);
    }
  }

  async function desativarC(id: string) {
    if (!window.confirm("Desativar esta conta?")) return;
    setSalvando(true);
    try {
      await desativarConta(id);
      onAtualizado();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    } finally {
      setSalvando(false);
    }
  }

  const modal = (
    <div className="modal-overlay" onClick={() => !salvando && onFechar()}>
      <div className="modal modal--cadastro livro-caixa__modal-cadastros" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="modal__titulo">Categorias e contas</h2>

        <div className="livro-caixa__abas-internas">
          <button type="button" className={`livro-caixa__aba-interna${aba === "categorias" ? " livro-caixa__aba-interna--ativa" : ""}`} onClick={() => setAba("categorias")}>
            Categorias
          </button>
          <button type="button" className={`livro-caixa__aba-interna${aba === "contas" ? " livro-caixa__aba-interna--ativa" : ""}`} onClick={() => setAba("contas")}>
            Contas
          </button>
        </div>

        {erro && (
          <p className="livro-caixa__erro-inline" role="alert">
            {erro}
          </p>
        )}

        {aba === "categorias" ? (
          <>
            <div className="livro-caixa__cadastro-form">
              <input className="modal__input" placeholder="Nome da categoria" value={nomeCat} onChange={(e) => setNomeCat(e.target.value)} />
              <select className="modal__input" value={tipoCat} onChange={(e) => setTipoCat(e.target.value as TipoMovimentacao)}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
              <button type="button" className="btn btn--primary" onClick={() => void salvarCategoria()} disabled={salvando}>
                {editCatId ? "Salvar" : "Adicionar"}
              </button>
            </div>
            <ul className="livro-caixa__lista-cadastros">
              {categorias.map((c) => (
                <li key={c.id} className={!c.ativa ? "livro-caixa__item-inativo" : ""}>
                  <span>
                    <strong>{c.nome}</strong>
                    <em>{labelTipoMovimentacao(c.tipo)}</em>
                  </span>
                  <span className="livro-caixa__lista-acoes">
                    {c.ativa && (
                      <>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() => {
                            setEditCatId(c.id);
                            setNomeCat(c.nome);
                            setTipoCat(c.tipo);
                          }}
                        >
                          Editar
                        </button>
                        <button type="button" className="btn btn--link" onClick={() => void desativarCat(c.id)}>
                          Desativar
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="livro-caixa__cadastro-form">
              <input className="modal__input" placeholder="Nome da conta" value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} />
              <button type="button" className="btn btn--primary" onClick={() => void salvarConta()} disabled={salvando}>
                {editContaId ? "Salvar" : "Adicionar"}
              </button>
            </div>
            <ul className="livro-caixa__lista-cadastros">
              {contas.map((c) => (
                <li key={c.id} className={!c.ativa ? "livro-caixa__item-inativo" : ""}>
                  <span>
                    <strong>{c.nome}</strong>
                  </span>
                  <span className="livro-caixa__lista-acoes">
                    {c.ativa && (
                      <>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() => {
                            setEditContaId(c.id);
                            setNomeConta(c.nome);
                          }}
                        >
                          Editar
                        </button>
                        <button type="button" className="btn btn--link" onClick={() => void desativarC(c.id)}>
                          Desativar
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal__botoes">
          <button type="button" className="btn btn--secondary" onClick={onFechar} disabled={salvando}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
