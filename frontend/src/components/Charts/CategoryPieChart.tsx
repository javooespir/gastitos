import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_COLORS } from '../../types';
import { formatARS } from '../../utils/formatters';

interface Props {
  data: Record<string, number>;
}

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function CategoryPieChart({ data }: Props) {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const chartData = sorted.map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin datos este mes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={100}
          dataKey="value"
          strokeWidth={2}
          stroke="rgba(255,255,255,0.05)"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={CATEGORY_COLORS[entry.name] ?? '#64748b'}
            />
          ))}
        </Pie>
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
          formatter={(value) => (
            <span className="text-slate-300 text-xs">{value}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
