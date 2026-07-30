import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS: Record<string, string> = {
  'A receber': '#A43F9B',
  Recebido: '#64748b',
  'Baixado / Cancelado': '#cbd5e1',
}

export type DonutChartItem = { name: string; value: number }

type DonutChartProps = {
  totalEmAberto: number
  totalPago: number
  totalBaixadoCancelado?: number
  centerLabel?: string
}

function formatPct(parte: number, total: number): string {
  if (total <= 0) return '0,0%'
  return `${((parte / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

export function DonutChart({
  totalEmAberto,
  totalPago,
  totalBaixadoCancelado = 0,
  centerLabel = 'Total a receber',
}: DonutChartProps) {
  const receber = Math.max(0, totalEmAberto)
  const pago = Math.max(0, totalPago)
  const baixado = Math.max(0, totalBaixadoCancelado)

  const data: DonutChartItem[] = [
    { name: 'A receber', value: receber },
    { name: 'Recebido', value: pago },
    { name: 'Baixado / Cancelado', value: baixado },
  ].filter((d) => d.value > 0)

  const totalGeral = receber + pago + baixado
  const temDados = data.length > 0
  const displayData = temDados ? data : [{ name: 'A receber', value: 1 }]
  const valorCentral = receber

  return (
    <div className="donut-chart">
      <div className="donut-chart__wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="82%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={900}
            >
              {displayData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={temDados ? COLORS[entry.name] : 'var(--chart-stroke-bg, #e2e8f0)'}
                  className="donut-chart__cell"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-chart__center" aria-hidden="true">
          <span className="donut-chart__valor">
            {valorCentral.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="donut-chart__label">{centerLabel}</span>
        </div>
      </div>
      <div className="donut-chart__legenda" aria-label="Legenda do montante a receber">
        {[
          { name: 'A receber', value: receber },
          { name: 'Recebido', value: pago },
          { name: 'Baixado / Cancelado', value: baixado },
        ].map((item) => (
          <div key={item.name} className="donut-chart__legenda-item">
            <span
              className={`donut-chart__legenda-bullet donut-chart__legenda-bullet--${item.name === 'A receber' ? 'receber' : item.name === 'Recebido' ? 'pago' : 'baixado'}`}
            />
            <span className="donut-chart__legenda-texto">
              <span>{item.name}</span>
              <strong>
                {item.value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              <em>{formatPct(item.value, totalGeral)}</em>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
