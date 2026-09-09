import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "@/components/inadimplentes/HonorariosIcons";
import { formatCpfCnpj } from "@/lib/inadimplentesUtils";
import type { ClienteHonorarios } from "@/hooks/honorariosClienteTypes";

type HonorariosHeaderProps = {
  cliente: ClienteHonorarios | null;
  nomeCliente: string;
};

export default function HonorariosHeader({ cliente, nomeCliente }: HonorariosHeaderProps) {
  return (
    <>
      <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar">
        <ArrowLeftIcon />
        Voltar para inadimplentes
      </Link>

      <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>

      <header className="page-inadimplentes-honorarios__header">
        <div>
          <h1 className="page-inadimplentes__title">Honorários em aberto</h1>
          <p className="page-inadimplentes-honorarios__cliente-nome">{nomeCliente}</p>
        </div>
        {(cliente?.email || cliente?.cpf) && (
          <div className="page-inadimplentes-honorarios__cliente-meta">
            {cliente?.cpf && <span>{formatCpfCnpj(cliente.cpf)}</span>}
            {cliente?.email && <span>{cliente.email}</span>}
          </div>
        )}
      </header>
    </>
  );
}
