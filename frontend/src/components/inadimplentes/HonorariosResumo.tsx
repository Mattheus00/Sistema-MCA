import { formatarMoeda } from "@/lib/valorBrasil";

type HonorariosResumoProps = {
  loading: boolean;
  qtdEmAberto: number;
  totalEmAberto: number;
  maiorAtraso: number;
};

export default function HonorariosResumo({
  loading,
  qtdEmAberto,
  totalEmAberto,
  maiorAtraso,
}: HonorariosResumoProps) {
  return (
    <div className="page-inadimplentes__cards page-inadimplentes-honorarios__cards">
      <div className="page-inadimplentes__card">
        <span className="page-inadimplentes__card-label">Honorários em aberto</span>
        <span className="page-inadimplentes__card-value">{loading ? "—" : qtdEmAberto}</span>
      </div>
      <div className="page-inadimplentes__card">
        <span className="page-inadimplentes__card-label">Total em aberto</span>
        <span className="page-inadimplentes__card-value">
          {loading ? "—" : formatarMoeda(totalEmAberto)}
        </span>
      </div>
      <div className="page-inadimplentes__card">
        <span className="page-inadimplentes__card-label">Maior atraso</span>
        <span className="page-inadimplentes__card-value">
          {loading ? "—" : `${maiorAtraso} dias`}
        </span>
      </div>
    </div>
  );
}
