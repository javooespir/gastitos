import { useState } from 'react';
import { TrendingDown, TrendingUp, PiggyBank, Plus, AlertCircle } from 'lucide-react';
import Header from '../components/Layout/Header';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import CategoryPieChart from '../components/Charts/CategoryPieChart';
import MonthlyBarChart from '../components/Charts/MonthlyBarChart';
import { useApp } from '../context/AppContext';
import { formatARS, formatUSD, formatRelative } from '../utils/formatters';
import { CATEGORY_COLORS } from '../types';

function StatCard({
  label, ars, usd, icon: Icon, color
}: {
  label: string;
  ars: number;
  usd: number;
  icon: any;
  color: 'red' | 'green' | 'blue' | 'purple';
}) {
  const colors = {
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };
  const iconColors = {
    red: 'text-red-400', green: 'text-emerald-400', blue: 'text-blue-400', purple: 'text-purple-400'
  };

  return (
    <div className="bg-surface-850 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{formatARS(ars)}</p>
      <p className="text-sm text-slate-500 font-mono mt-1">{formatUSD(usd)}</p>
    </div>
  );
}

export default function Dashboard() {
  const { monthlySummary, history, transactions, insights, refreshTransactions, refreshSummary } = useApp();
  const [showForm, setShowForm] = useState(false);

  const recent = transactions.slice(0, 8);
  const unreadAlerts = insights.filter(i => !i.leido && i.tipo === 'alerta').slice(0, 3);

  const handleSuccess = () => {
    refreshTransactions();
    refreshSummary();
  };

  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Resumen de ${monthName}`}
      />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Gastos del mes"
            ars={monthlySummary?.totalGastadoARS ?? 0}
            usd={monthlySummary?.totalGastadoUSD ?? 0}
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            label="Ingresos del mes"
            ars={monthlySummary?.totalIngresadoARS ?? 0}
            usd={monthlySummary?.totalIngresadoUSD ?? 0}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Ahorro del mes"
            ars={monthlySummary?.totalAhorradoARS ?? 0}
            usd={monthlySummary?.totalAhorradoUSD ?? 0}
            icon={PiggyBank}
            color="blue"
          />
          <StatCard
            label="Balance neto"
            ars={(monthlySummary?.totalIngresadoARS ?? 0) - (monthlySummary?.totalGastadoARS ?? 0)}
            usd={(monthlySummary?.totalIngresadoUSD ?? 0) - (monthlySummary?.totalGastadoUSD ?? 0)}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Alerts */}
        {unreadAlerts.length > 0 && (
          <div className="space-y-2">
            {unreadAlerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  alert.impacto === 'alto'
                    ? 'bg-red-500/10 border-red-500/20'
                    : alert.impacto === 'medio'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
                }`}
              >
                <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  alert.impacto === 'alto' ? 'text-red-400' : alert.impacto === 'medio' ? 'text-amber-400' : 'text-blue-400'
                }`} />
                <div>
                  <p className="text-sm text-white font-medium">{alert.mensaje}</p>
                  <p className="text-xs text-slate-400 mt-1">{alert.accion}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Gasto por categoría</h2>
            <CategoryPieChart data={monthlySummary?.categorySums ?? {}} />
          </div>

          <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Evolución mensual (6 meses)</h2>
            <MonthlyBarChart history={history} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-surface-850 border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="text-sm font-semibold text-slate-300">Transacciones recientes</h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No hay transacciones aún.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium"
              >
                Agregar la primera
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recent.map(t => (
                <div key={t.id} className="flex items-center px-6 py-4 hover:bg-white/2 transition-colors gap-4">
                  <div
                    className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}30`, color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8' }}
                  >
                    {t.categoria.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.categoria}</p>
                    <p className="text-xs text-slate-500">{t.descripcion || t.cuenta} · {formatRelative(t.fecha)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold font-mono ${
                      t.tipo === 'gasto' ? 'text-red-400' :
                      t.tipo === 'ingreso' ? 'text-emerald-400' :
                      t.tipo === 'ahorro' ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {t.tipo === 'gasto' ? '-' : '+'}{formatARS(t.montoARS)}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">{formatUSD(t.montoUSD)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
