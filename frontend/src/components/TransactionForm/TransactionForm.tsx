import { useState, FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { transactionsApi } from '../../api/client';
import { TransactionInput, ALL_CATEGORIES, CATEGORIES, CUENTAS } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionForm({ onClose, onSuccess }: Props) {
  const { rates } = useApp();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<TransactionInput>({
    fecha: today,
    categoria: 'Alimentación',
    montoARS: 0,
    tipo: 'gasto',
    descripcion: '',
    cuenta: 'Billetera'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const montoUSD = rates && form.montoARS > 0
    ? (form.montoARS / rates.blue).toFixed(2)
    : '—';

  const availableCategories = form.tipo === 'ingreso' || form.tipo === 'ahorro'
    ? CATEGORIES.ingresos
    : [...CATEGORIES.gastos];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.montoARS <= 0) { setError('El monto debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      await transactionsApi.create(form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTipoChange = (tipo: TransactionInput['tipo']) => {
    const defaultCat = tipo === 'ingreso' || tipo === 'ahorro'
      ? 'Salario'
      : 'Alimentación';
    setForm(f => ({ ...f, tipo, categoria: defaultCat }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-400" />
            Nueva Transacción
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Tipo</label>
            <div className="grid grid-cols-4 gap-2">
              {(['gasto', 'ingreso', 'ahorro', 'inversion'] as const).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => handleTipoChange(tipo)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                    form.tipo === tipo
                      ? tipo === 'gasto'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : tipo === 'ingreso'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : tipo === 'ahorro'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  {tipo === 'inversion' ? 'Inversión' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Monto ARS</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montoARS || ''}
                onChange={e => setForm(f => ({ ...f, montoARS: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50 focus:bg-white/8"
                placeholder="0"
                required
              />
            </div>
            {form.montoARS > 0 && (
              <p className="text-xs text-slate-500 mt-1 font-mono">
                ≈ USD {montoUSD} {rates ? `(Blue $${Math.round(rates.blue).toLocaleString('es-AR')})` : ''}
              </p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 appearance-none"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat} className="bg-surface-800">{cat}</option>
              ))}
            </select>
          </div>

          {/* Fecha y Cuenta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Fecha</label>
              <input
                type="date"
                value={form.fecha ?? today}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Cuenta</label>
              <select
                value={form.cuenta}
                onChange={e => setForm(f => ({ ...f, cuenta: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm appearance-none"
              >
                {CUENTAS.map(c => (
                  <option key={c} value={c} className="bg-surface-800">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Descripción (opcional)</label>
            <input
              type="text"
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
              placeholder="ej: Súper Coto, nafta, etc."
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
