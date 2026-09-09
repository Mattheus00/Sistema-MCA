/** Tipos de apresentação do dashboard. A lógica de derivação fica em `lib/dashboardUtils.ts`. */

export type PontoEvolucao = { mes: string; mesLabel: string; valor: number };

export type FaixaInadimplenciaUi = {
  id: string;
  rotulo: string;
  valor: number;
  percentual: number;
  cor: "verde" | "amarelo" | "laranja" | "vermelho";
};

export type AtividadeDashboard = {
  id: string;
  titulo: string;
  descricao: string;
  usuario?: string;
  dataHora?: string;
  status?: string;
  valor?: number;
};
