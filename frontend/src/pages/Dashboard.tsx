import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, TrendingUp, PiggyBank, Plus, AlertCircle, CalendarClock, ArrowRight, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Layout/Header';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import CategoryPieChart from '../components/Charts/CategoryPieChart';
import MonthlyBarChart from '../components/Charts/MonthlyBarChart';
import { useApp } from '../context/AppContext';
import { transactionsApi } from '../api/client';
import { formatARS, formatUSD, formatRelative } from '../utils/formatters';
import { CATEGORY_COLORS, MonthlySummary, Transaction } from '../types';

interface SavingsTotals {
  totalAhorroARS: number;
  totalAhorroUSD: number;
  totalInversionARS: number;
  totalInversionUSD: number;
  countAhorro: number;
  countInversion: number;
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function StatCard({ label, ars, usd, icon: Icon, color }: {
  label: string; ars: number; usd: number; icon: any;
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
  const { history, transactions, insights, fixedExpenses, loans, refreshTransactions, refreshSummary } = useApp();
  const [showForm, setShowForm] = useState(false);

  // Month navigator — own local state so it doesn't affect AppContext
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [savingsTotals, setSavingsTotals] = useState<SavingsTotals | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);

  const fetchSummary = useCallback(async (y: number, m: number) => {
    setLoadingSummary(true);
    try {
      const res = await transactionsApi.monthlySummary(y, m);
      setSummary(res.data);
    } catch { /* silent */ } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchTotals = useCallback(async () => {
    try {
      const res = await transactionsApi.totals();
      setSavingsTotals(res.data);
    } catch { /* silent */ }
  }, []);

  // Fetch recent transactions for the selected month, excluding Tarjeta BBVA
  const fetchRecent = useCallback(async (y: number, m: number) => {
    try {
      const start = new Date(y, m - 1, 1).toISOString();
      const end = new Date(y, m, 0, 23, 59, 59).toISOString();
      const res = await transactionsApi.list({ startDate: start, endDate: end, limit: 30 });
      const all: Transaction[] = res.data.data ?? res.data;
      setRecentTxs(all.filter(t => t.cuenta !== 'Tarjeta BBVA').slice(0, 8));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSummary(year, month); fetchRecent(year, month); }, [year, month, fetchSummary, fetchRecent]);
  useEffect(() => { fetchTotals(); }, [fetchTotals]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const handleSuccess = () => {
    refreshTransactions();
    refreshSummary();
    fetchSummary(year, month);
    fetchRecent(year, month);
    fetchTotals();
  };
  const unreadAlerts = insights.filter(i => !i.leido && i.tipo === 'alerta').slice(0, 3);
  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.monto, 0);
  const fixedPendiente = fixedExpenses.filter(e => !e.pagadoEsteMes).reduce((s, e) => s + e.monto, 0);
  const fixedPendienteCount = fixedExpenses.filter(e => !e.pagadoEsteMes).length;
  const totalCuotasCreditos = loans.filter(l => l.estado === 'activo').reduce((s, l) => s + l.montoCuotaActual, 0);

  return (
    <>
      <Header title="Dashboard" subtitle="Resumen mensual" />

      <div className="p-8 space-y-8">

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[170px]">
              <span className="text-lg font-semibold text-white capitalize">
                {MONTHS_ES[month - 1]} {year}
              </span>
              {!isCurrentMonth && (
                <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
                  className="block text-xs text-brand-400 hover:text-brand-300 mx-auto mt-0.5 transition-colors">
                  ← Mes actual
                </button>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {loadingSummary && <span className="text-xs text-slate-500 animate-pulse">Cargando...</span>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Gastos del mes" ars={summary?.totalGastadoARS ?? 0} usd={summary?.totalGastadoUSD ?? 0} icon={TrendingDown} color="red" />
          <StatCard label="Ingresos del mes" ars={summary?.totalIngresadoARS ?? 0} usd={summary?.totalIngresadoUSD ?? 0} icon={TrendingUp} color="green" />
          <StatCard label="Ahorro del mes" ars={summary?.totalAhorradoARS ?? 0} usd={summary?.totalAhorradoUSD ?? 0} icon={PiggyBank} color="blue" />
          <StatCard label="Balance neto"
            ars={(summary?.totalIngresadoARS ?? 0) - (summary?.totalGastadoARS ?? 0)}
            usd={(summary?.totalIngresadoUSD ?? 0) - (summary?.totalGastadoUSD ?? 0)}
            icon={TrendingUp} color="purple" />
        </div>

        {/* Total accumulated savings (all-time, all months) */}
        {savingsTotals !== null && (savingsTotals.totalAhorroARS > 0 || savingsTotals.totalAhorroUSD > 0 || savingsTotals.totalInversionUSD > 0) && (
          <div className="bg-surface-850 border border-blue-500/15 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Metas / Ahorro</p>
                  <p className="text-xs text-slate-500">Suma acumulada de todos los meses</p>
                </div>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                {savingsTotals.totalAhorroARS > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Ahorros en pesos</p>
                    <p className="text-lg font-bold font-mono text-blue-400">{formatARS(savingsTotals.totalAhorroARS)}</p>
                    <p className="text-xs text-slate-600">{savingsTotals.countAhorro} transacciones</p>
                  </div>
                )}
                {savingsTotals.totalAhorroUSD > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Ahorros en USD</p>
                    <p className="text-lg font-bold font-mono text-emerald-400">{formatUSD(savingsTotals.totalAhorroUSD)}</p>
                  </div>
                )}
                {savingsTotals.totalInversionUSD > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Inversiones USD</p>
                    <p className="text-lg font-bold font-mono text-purple-400">{formatUSD(savingsTotals.totalInversionUSD)}</p>
                    <p className="text-xs text-slate-600">{savingsTotals.countInversion} transacciones</p>
                  </div>
                )}
              </div>
              <Link to="/goals" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors flex-shrink-0">
                Ver metas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Alerts */}
        {unreadAlerts.length > 0 && (
          <div className="space-y-2">
            {unreadAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                alert.impacto === 'alto' ? 'bg-red-500/10 border-red-500/20' :
                alert.impacto === 'medio' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-blue-500/10 border-blue-500/20'
              }`}>
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

        {/* Fixed expenses + loans */}
        {(fixedExpenses.length > 0 || loans.filter(l => l.estado === 'activo').length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fixedExpenses.length > 0 && (
              <div className={`rounded-2xl p-5 border ${fixedPendiente > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-surface-850 border-white/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock className={`w-4 h-4 ${fixedPendiente > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className={`text-sm font-medium ${fixedPendiente > 0 ? 'text-amber-300' : 'text-slate-300'}`}>Gastos fijos</span>
                  </div>
                  <Link to="/fixed-expenses" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                    Ver <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {fixedPendiente > 0 ? (
                  <>
                    <p className="text-xs text-amber-400/70 mb-1">Reservá para pagar este mes</p>
                    <p className="text-2xl font-bold font-mono text-amber-400">{formatARS(fixedPendiente)}</p>
                    <p className="text-xs text-slate-500 mt-1">{fixedPendienteCount} pendiente{fixedPendienteCount !== 1 ? 's' : ''} de {fixedExpenses.length} total</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-emerald-400/70 mb-1">Todos pagados este mes ✓</p>
                    <p className="text-2xl font-bold font-mono text-slate-300">{formatARS(fixedTotal)}</p>
                    <p className="text-xs text-slate-500 mt-1">{fixedExpenses.length} gastos fijos</p>
                  </>
                )}
              </div>
            )}
            {loans.filter(l => l.estado === 'activo').length > 0 && (
              <div className="bg-surface-850 border border-red-500/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-slate-300">Cuotas créditos</span>
                  </div>
                  <Link to="/loans" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                    Ver <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-xs text-red-400/70 mb-1">A pagar este mes</p>
                <p className="text-2xl font-bold font-mono text-red-400">{formatARS(totalCuotasCreditos)}</p>
                <p className="text-xs text-slate-500 mt-1">{loans.filter(l => l.estado === 'activo').length} crédito{loans.filter(l => l.estado === 'activo').length !== 1 ? 's' : ''} activo{loans.filter(l => l.estado === 'activo').length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Gasto por categoría</h2>
            <CategoryPieChart data={summary?.categorySums ?? {}} />
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
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>
          {recentTxs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No hay transacciones aún en este mes.</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium">
                Agregar la primera
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTxs.map(t => (
                <div key={t.id} className="flex items-center px-6 py-4 hover:bg-white/2 transition-colors gap-4">
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}30`, color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8' }}>
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
        <TransactionForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}
    </>
  );
}
