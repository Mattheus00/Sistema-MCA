import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, RefreshIcon, SaveIcon, UserIcon } from "@/components/clientes/ClientesIcons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { FORM_VAZIO, maskCelular, maskCpfCnpj } from "@/hooks/clientesTypes";
import type { Cliente } from "@/types/api";

type ClienteFormModalProps = {
  clienteEmEdicao: Cliente | null;
  form: Cliente;
  setForm: Dispatch<SetStateAction<Cliente>>;
  setModalAberto: Dispatch<SetStateAction<boolean>>;
  setClienteEmEdicao: Dispatch<SetStateAction<Cliente | null>>;
  criar: () => void;
  atualizar: () => void;
};

export default function ClienteFormModal({
  clienteEmEdicao,
  form,
  setForm,
  setModalAberto,
  setClienteEmEdicao,
  criar,
  atualizar,
}: ClienteFormModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => {
        setModalAberto(false);
        setClienteEmEdicao(null);
      }}
    >
      <div
        className="modal modal-cliente"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cliente-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-cliente__close"
          onClick={() => {
            setModalAberto(false);
            setClienteEmEdicao(null);
          }}
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>

        <header className="modal-cliente__header">
          <div className="modal-cliente__icon" aria-hidden="true">
            <UserIcon />
          </div>
          <div>
            <h2 id="modal-cliente-titulo" className="modal-cliente__title">
              {clienteEmEdicao ? "Editar Cliente" : "Cadastro de Cliente"}
            </h2>
            <p className="modal-cliente__subtitle">Preencha as informações do cliente.</p>
          </div>
        </header>

        <div className="modal-cliente__body">
          <div className="modal-cliente__row">
            <label className="modal-cliente__label" htmlFor="cliente-codigo">
              Código
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-codigo"
                placeholder="Ex.: 35 ou MCA"
                value={form.codigo ?? ""}
                onChange={(e) =>
                  setForm({ ...form, codigo: e.target.value.toUpperCase().slice(0, 20) })
                }
                className="modal-cliente__input"
                maxLength={20}
                autoComplete="off"
              />
              <p className="modal-cliente__hint">Código interno para identificação do cliente.</p>
            </div>
          </div>

          <div className="modal-cliente__row">
            <label
              className="modal-cliente__label modal-cliente__label--required"
              htmlFor="cliente-nome"
            >
              Nome
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-nome"
                placeholder="Digite o nome completo"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="modal-cliente__input"
              />
            </div>
          </div>

          <div className="modal-cliente__row">
            <label
              className="modal-cliente__label modal-cliente__label--required"
              htmlFor="cliente-cpf"
            >
              CPF/CNPJ
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-cpf"
                placeholder="000.000.000-00"
                value={form.cpf ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[a-zA-Z]/.test(v)) {
                    setForm({
                      ...form,
                      cpf: v
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 18),
                    });
                  } else {
                    setForm({ ...form, cpf: maskCpfCnpj(v) });
                  }
                }}
                className="modal-cliente__input"
                maxLength={18}
                autoComplete="off"
              />
              <p className="modal-cliente__hint">Informe o CPF ou CNPJ do cliente.</p>
            </div>
          </div>

          <div className="modal-cliente__row">
            <label className="modal-cliente__label" htmlFor="cliente-endereco">
              Endereço
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-endereco"
                placeholder="Rua, número, bairro, cidade - UF"
                value={form.endereco ?? ""}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                className="modal-cliente__input"
              />
            </div>
          </div>

          <div className="modal-cliente__row">
            <label className="modal-cliente__label" htmlFor="cliente-celular">
              Celular
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-celular"
                type="tel"
                placeholder="(00) 00000-0000"
                value={form.celular ?? ""}
                onChange={(e) => setForm({ ...form, celular: maskCelular(e.target.value) })}
                className="modal-cliente__input"
                maxLength={15}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="modal-cliente__row">
            <label className="modal-cliente__label" htmlFor="cliente-email">
              E-mail
            </label>
            <div className="modal-cliente__control">
              <input
                id="cliente-email"
                placeholder="email@exemplo.com"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="modal-cliente__input"
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                title="Informe um e-mail válido (ex: nome@exemplo.com)"
              />
            </div>
          </div>

          {clienteEmEdicao && (
            <div className="modal-cliente__row">
              <span className="modal-cliente__label">Situação</span>
              <div className="modal-cliente__control">
                <div className="modal-cliente__toggle-wrap page-clientes__toggle-wrap">
                  <span className="page-clientes__toggle-label">
                    {(form.situacao ?? "Ativo") !== "Inativo" ? "Ativo" : "Inativo"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={(form.situacao ?? "Ativo") !== "Inativo"}
                    aria-label={
                      (form.situacao ?? "Ativo") !== "Inativo"
                        ? "Ativo - clicar para desativar"
                        : "Inativo - clicar para ativar"
                    }
                    className={`page-clientes__toggle ${(form.situacao ?? "Ativo") !== "Inativo" ? "page-clientes__toggle--on" : ""}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        situacao: (form.situacao ?? "Ativo") !== "Inativo" ? "Inativo" : "Ativo",
                      })
                    }
                  >
                    <span className="page-clientes__toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="modal-cliente__footer">
          {!clienteEmEdicao && (
            <button
              type="button"
              className="btn btn--secondary modal-cliente__btn-limpar"
              onClick={() => setForm({ ...FORM_VAZIO })}
            >
              <RefreshIcon />
              Limpar campos
            </button>
          )}
          <div className="modal-cliente__footer-right">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setModalAberto(false);
                setClienteEmEdicao(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary modal-cliente__btn-salvar"
              onClick={clienteEmEdicao ? atualizar : criar}
            >
              <SaveIcon />
              {clienteEmEdicao ? "Salvar alterações" : "Salvar cliente"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
