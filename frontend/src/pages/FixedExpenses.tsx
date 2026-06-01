import { useState, FormEvent } from 'react';
import { Plus, X, Edit2, Check, CalendarClock, AlertCircle } from 'lucide-react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { fixedExpensesApi } from '../api/client';
import { FixedExpense, CATEGORIES } from '../types';
import { formatARS } from '../utils/formatters';

const ALL_GASTO_CATEGORIES = [...CATEGORIES.gastos];

function ExpenseRow({ expense, onUpdate }: { expense: FixedExpense; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre: expense.nombre, monto: expense.monto.toString(), categoria: expense.categoria, diaMes: expense.diaMes.toString() });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fixedExpensesApi.update(expense.id, { nombre: form.nombre, monto: Number(form.monto), categoria: form.categoria, diaMes: Number(form.diaMes) });
      onUpdate();
      setEditing(false);
    } finally { setSaving(false); }
  };

  const handleTogglePago = async () => {
    setSaving(true);
    try {
      if (expense.pagadoEsteMes) {
        await fixedExpensesApi.unpagar(expense.id);
      } else {
        await fixedExpensesApi.pagar(expense.id);
      }
      onUpdate();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${expense.nombre}"?`)) return;
    await fixedExpensesApi.remove(expense.id);
    onUpdate();
  };

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/3">
        <td className="px-4 py-3" colSpan={5}>
          <form onSubmit={handleSave} className="flex items-center gap-3 flex-wrap">
            <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="flex-1 min-w-[150px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-brand-500/50"
              placeholder="Nombre" required />
            <input type="number" min="0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50"
              placeholder="Monto ARS" required />
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none appearance-none">
              {ALL_GASTO_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-800">{c}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Día</span>
              <input type="number" min="1" max="31" value={form.diaMes} onChange={e => setForm(f => ({ ...f, diaMes: e.target.value }))}
                className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg transition-colors">OK</button>
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 border border-white/10 text-slate-400 hover:text-white text-xs rounded-lg transition-colors">Cancelar</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-white/5 hover:bg-white/2 transition-colors group ${expense.pagadoEsteMes ? 'opacity-60' : ''}`}>
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleTogglePago} disabled={saving}
            className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${expense.pagadoEsteMes ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-white/5 hover:border-emerald-500/50'}`}>
            {expense.pagadoEsteMes && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className={`text-sm font-medium ${expense.pagadoEsteMes ? 'line-through text-slate-500' : 'text-white'}`}>{expense.nombre}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400 text-sm">{expense.categoria}</td>
      <td className="px-4 py-3 text-slate-400 text-sm text-center">día {expense.diaMes}</td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-red-400">{formatARS(expense.monto)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function FixedExpenses() {
  const { fixedExpenses, refreshFixedExpenses } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', monto: '', categoria: 'Casa', diaMes: '1' });
  const [saving, setSaving] = useState(false);

  const totalMensual = fixedExpenses.reduce((s, e) => s + e.monto, 0);
  const totalPagado = fixedExpenses.filter(e => e.pagadoEsteMes).reduce((s, e) => s + e.monto, 0);
  const totalPendiente = totalMensual - totalPagado;
  const pagados = fixedExpenses.filter(e => e.pagadoEsteMes).length;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fixedExpensesApi.create({ nombre: form.nombre, monto: Number(form.monto), categoria: form.categoria, diaMes: Number(form.diaMes) });
      refreshFixedExpenses();
      setShowForm(false);
      setForm({ nombre: '', monto: '', categoria: 'Casa', diaMes: '1' });
    } finally { setSaving(false); }
  };

  const sortedExpenses = [...fixedExpenses].sort((a, b) => {
    if (a.pagadoEsteMes !== b.pagadoEsteMes) return a.pagadoEsteMes ? 1 : -1;
    return a.diaMes - b.diaMes;
  });

  return (
    <>
      <Header title="Gastos Fijos" subtitle={`${fixedExpenses.length} gastos · ${pagados} pagados este mes`} />

      <div className="p-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-slate-400 mb-1">Total mensual</p>
            <p className="text-2xl font-bold font-mono text-white">{formatARS(totalMensual)}</p>
          </div>
          <div className="bg-surface-850 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-xs text-emerald-400 mb-1">Ya pagado</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">{formatARS(totalPagado)}</p>
          </div>
          <div className={`bg-surface-850 rounded-2xl p-5 ${totalPendiente > 0 ? 'border border-amber-500/20' : 'border border-white/5'}`}>
            <p className={`text-xs mb-1 ${totalPendiente > 0 ? 'text-amber-400' : 'text-slate-400'}`}>Pendiente este mes</p>
            <p className={`text-2xl font-bold font-mono ${totalPendiente > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{formatARS(totalPendiente)}</p>
          </div>
        </div>

        {totalPendiente > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Reservá {formatARS(totalPendiente)} para gastos fijos pendientes</p>
              <p className="text-xs text-slate-400 mt-0.5">{fixedExpenses.filter(e => !e.pagadoEsteMes).length} gastos sin pagar este mes</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-slate-300">Lista de gastos fijos</span>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          {fixedExpenses.length === 0 ? (
            <div className="text-center py-16">
              <CalendarClock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No hay gastos fijos configurados</p>
              <p className="text-slate-600 text-xs mt-1">Agregá alquiler, servicios, suscripciones...</p>
              <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-colors">
                Agregar gasto fijo
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="text-left px-6 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-center px-4 py-3 font-medium">Vence</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map(e => (
                  <ExpenseRow key={e.id} expense={e} onUpdate={refreshFixedExpenses} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-brand-400" /> Nuevo gasto fijo
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50"
                  placeholder="ej: Alquiler, Netflix, Luz..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Monto (ARS)</label>
                  <input type="number" min="0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="0" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Día del mes</label>
                  <input type="number" min="1" max="31" value={form.diaMes} onChange={e => setForm(f => ({ ...f, diaMes: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50"
                    placeholder="1" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Categoría</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 appearance-none">
                  {ALL_GASTO_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-800">{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
