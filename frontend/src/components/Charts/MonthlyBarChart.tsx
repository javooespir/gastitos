import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { MonthHistory } from '../../types';
import { formatARS } from '../../utils/formatters';

interface Props {
  history: MonthHistory[];
}

export default function MonthlyBarChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin historial disponible
      </div>
    );
  }

  const data = history.map(h => ({
    mes: h.label,
    Gastos: Math.round(h.totalGastadoARS),
    Ingresos: Math.round(h.totalIngresadoARS),
    Ahorro: Math.round(h.totalAhorradoARS)
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="mes"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: 'white'
          }}
          formatter={(value: number) => [formatARS(value), '']}
        />
        <Legend
          formatter={v => <span className="text-slate-300 text-xs">{v}</span>}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="Ahorro" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
