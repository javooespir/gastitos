import { useState, FormEvent } from 'react';
import { Plus, Target, X, Edit2, Check, TrendingUp, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { goalsApi } from '../api/client';
import { Goal } from '../types';
import { formatUSD, formatDate, clamp } from '../utils/formatters';

function AllocationBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    ahorro: 'bg-blue-500/10 text-blue-400',
    inversion: 'bg-purple-500/10 text-purple-400'
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colors[tipo] || 'bg-white/5 text-slate-400'}`}>
      {tipo}
    </span>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: Goal;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editingInitial, setEditingInitial] = useState(false);
  const [newInitial, setNewInitial] = useState(goal.ahorroActualUSD.toString());
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const total = goal.ahorroTotalUSD ?? goal.ahorroActualUSD;
  const pct = clamp(Math.round((total / goal.montoObjetivoUSD) * 100), 0, 100);
  const falta = Math.max(0, goal.montoObjetivoUSD - total);
  const diasRestantes = Math.max(0, Math.ceil((new Date(goal.fechaTargetFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const mesesRestantes = Math.max(0, Math.round(diasRestantes / 30));
  const ritmoNecesario = mesesRestantes > 0 ? (falta / mesesRestantes).toFixed(0) : '0';

  const handleSaveInitial = async () => {
    setSaving(true);
    try {
      await goalsApi.update(goal.id, { ahorroActualUSD: Number(newInitial) });
      onUpdate();
      setEditingInitial(false);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDone = async () => {
    await goalsApi.update(goal.id, { estado: 'alcanzada' });
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar meta "${goal.nombre}"?`)) return;
    await goalsApi.remove(goal.id);
    onDelete();
  };

  const handleRemoveAllocation = async (allocId: string) => {
    if (!confirm('¿Quitar este aporte de la meta?')) return;
    await goalsApi.removeAllocation(allocId);
    onUpdate();
  };

  const barColor = pct >= 75 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const recentAllocs = (goal.allocations ?? []).slice(0, 5);

  return (
    <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white leading-tight">{goal.nombre}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-500">Hasta {formatDate(goal.fechaTargetFin)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {goal.estado === 'en_progreso' && (
              <button
                onClick={handleMarkDone}
                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Marcar como alcanzada"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progreso */}
        <div className="mb-3">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-white font-mono">{formatUSD(total)}</span>
              <p className="text-xs text-slate-500 mt-0.5">de {formatUSD(goal.montoObjetivoUSD)}</p>
            </div>
            <span className="text-2xl font-bold font-mono" style={{ color: barColor }}>{pct}%</span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Desglose saldo inicial */}
        {goal.ahorroActualUSD > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Saldo inicial: <span className="text-slate-400 font-mono">{formatUSD(goal.ahorroActualUSD)}</span></span>
              {!editingInitial && (
                <button onClick={() => { setNewInitial(goal.ahorroActualUSD.toString()); setEditingInitial(true); }} className="hover:text-slate-300 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingInitial && (
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  value={newInitial}
                  onChange={e => setNewInitial(e.target.value)}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-brand-500/50"
                  min="0"
                  autoFocus
                />
                <button onClick={handleSaveInitial} disabled={saving} className="px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg transition-colors">
                  OK
                </button>
                <button onClick={() => setEditingInitial(false)} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-1">Falta</p>
            <p className="text-sm font-semibold text-white font-mono">{formatUSD(falta)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-1">Meses</p>
            <p className="text-sm font-semibold text-white font-mono">{mesesRestantes}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-1">x mes</p>
            <p className="text-sm font-semibold text-white font-mono">U$D {ritmoNecesario}</p>
          </div>
        </div>
      </div>

      {/* Aportes recientes */}
      {recentAllocs.length > 0 && (
        <div className="border-t border-white/5">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {recentAllocs.length} aporte{recentAllocs.length !== 1 ? 's' : ''} reciente{recentAllocs.length !== 1 ? 's' : ''}
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-400">{formatUSD(goal.allocatedUSD ?? 0)} total</span>
            </span>
            <span className="text-slate-600">{showHistory ? '▲' : '▼'}</span>
          </button>

          {showHistory && (
            <div className="px-5 pb-3 space-y-1.5">
              {recentAllocs.map(alloc => (
                <div key={alloc.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 min-w-0">
                    <AllocationBadge tipo={alloc.transaction?.tipo ?? 'ahorro'} />
                    <span className="text-xs text-slate-400 truncate">
                      {alloc.transaction?.descripcion?.replace(/^\[.*?\]\s*/, '') || formatDate(alloc.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-mono text-slate-300">{formatUSD(alloc.montoUSD)}</span>
                    <button
                      onClick={() => handleRemoveAllocation(alloc.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                      title="Quitar aporte"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {(goal.allocations ?? []).length > 5 && (
                <p className="text-xs text-slate-600 pt-1">y {(goal.allocations ?? []).length - 5} más...</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sin aportes aún */}
      {recentAllocs.length === 0 && goal.ahorroActualUSD === 0 && goal.estado === 'en_progreso' && (
        <div className="border-t border-white/5 px-5 py-3">
          <p className="text-xs text-slate-600">Agregá un ahorro o inversión y asignalo a esta meta</p>
        </div>
      )}

      {/* Estado badge */}
      <div className="px-5 pb-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
          goal.estado === 'alcanzada'
            ? 'bg-emerald-500/10 text-emerald-400'
            : pct >= 10 ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          <TrendingUp className="w-3 h-3" />
          {goal.estado === 'alcanzada' ? 'Alcanzada' : pct >= 10 ? 'En progreso' : 'Sin aportes'}
        </span>
      </div>
    </div>
  );
}

export default function Goals() {
  const { goals, refreshGoals } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    montoObjetivoUSD: '',
    ahorroActualUSD: '',
    fechaTargetInicio: new Date().toISOString().split('T')[0],
    fechaTargetFin: '2027-12-31'
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await goalsApi.create({
        ...form,
        montoObjetivoUSD: Number(form.montoObjetivoUSD),
        ahorroActualUSD: form.ahorroActualUSD ? Number(form.ahorroActualUSD) : 0
      });
      refreshGoals();
      setShowForm(false);
      setForm({ nombre: '', montoObjetivoUSD: '', ahorroActualUSD: '', fechaTargetInicio: new Date().toISOString().split('T')[0], fechaTargetFin: '2027-12-31' });
    } finally {
      setSaving(false);
    }
  };

  const active = goals.filter(g => g.estado === 'en_progreso');
  const done = goals.filter(g => g.estado === 'alcanzada');
  const totalAhorradoUSD = goals.reduce((sum, g) => sum + (g.ahorroTotalUSD ?? g.ahorroActualUSD), 0);
  const totalObjetivoUSD = goals.reduce((sum, g) => sum + g.montoObjetivoUSD, 0);

  return (
    <>
      <Header title="Metas de Ahorro" subtitle={`${active.length} activas · ${done.length} alcanzadas`} />

      <div className="p-8 space-y-8">
        {/* Summary bar */}
        {goals.length > 0 && (
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total ahorrado</p>
              <p className="text-2xl font-bold font-mono text-white">{formatUSD(totalAhorradoUSD)}</p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Progreso global</span>
                <span className="font-mono">{totalObjetivoUSD > 0 ? Math.round((totalAhorradoUSD / totalObjetivoUSD) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: `${totalObjetivoUSD > 0 ? clamp(Math.round((totalAhorradoUSD / totalObjetivoUSD) * 100), 0, 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Objetivo total</p>
              <p className="text-lg font-bold font-mono text-slate-300">{formatUSD(totalObjetivoUSD)}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No tenés metas configuradas</p>
            <p className="text-slate-600 text-sm mt-1">Creá tu primera meta y vinculá tus ahorros a ella</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors"
            >
              Crear meta
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">En progreso</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {active.map(g => (
                    <GoalCard key={g.id} goal={g} onUpdate={refreshGoals} onDelete={refreshGoals} />
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Alcanzadas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
                  {done.map(g => (
                    <GoalCard key={g.id} goal={g} onUpdate={refreshGoals} onDelete={refreshGoals} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-400" />
                Nueva Meta
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Nombre de la meta</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50"
                  placeholder="ej: Viaje a Japón"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Objetivo (USD)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.montoObjetivoUSD}
                    onChange={e => setForm(f => ({ ...f, montoObjetivoUSD: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="5000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Saldo inicial (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.ahorroActualUSD}
                    onChange={e => setForm(f => ({ ...f, ahorroActualUSD: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Inicio</label>
                  <input
                    type="date"
                    value={form.fechaTargetInicio}
                    onChange={e => setForm(f => ({ ...f, fechaTargetInicio: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-brand-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Fecha límite</label>
                  <input
                    type="date"
                    value={form.fechaTargetFin}
                    onChange={e => setForm(f => ({ ...f, fechaTargetFin: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-brand-500/50"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">El saldo inicial es para dinero que ya tenés guardado. Los aportes futuros se vinculan desde las transacciones.</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creando...' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
