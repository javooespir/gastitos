import { useState, FormEvent, useEffect } from 'react';
import { X, Plus, Edit2, Target, ChevronDown } from 'lucide-react';
import { transactionsApi } from '../../api/client';
import { Transaction, TransactionInput, CATEGORIES, CUENTAS } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction; // if provided = edit mode
}

interface AllocationRow {
  goalId: string;
  montoUSD: string;
}

export default function TransactionForm({ onClose, onSuccess, editTransaction }: Props) {
  const { rates, goals } = useApp();
  const isEdit = !!editTransaction;
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
  const [esSaldoPrevio, setEsSaldoPrevio] = useState(false);
  const [monedaAhorro, setMonedaAhorro] = useState<'ARS' | 'USD'>('ARS');
  const [montoRaw, setMontoRaw] = useState<number>(0);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [showAllocations, setShowAllocations] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editTransaction) {
      const t = editTransaction;
      const fechaStr = t.fecha ? new Date(t.fecha).toISOString().split('T')[0] : today;
      const isUSD = t.descripcion?.startsWith('[USD ');
      const usdMatch = t.descripcion?.match(/^\[USD ([^\]]+)\]/);

      setForm({
        fecha: fechaStr,
        categoria: t.categoria,
        montoARS: t.montoARS,
        tipo: t.tipo,
        descripcion: t.descripcion?.replace(/^\[Saldo previo\]\s*/, '').replace(/^\[USD [^\]]+\]\s*/, '') || '',
        cuenta: t.cuenta
      });

      if (isUSD && usdMatch) {
        setMonedaAhorro('USD');
        setMontoRaw(parseFloat(usdMatch[1]));
      } else {
        setMontoRaw(t.montoARS);
      }

      if (t.descripcion?.includes('[Saldo previo]')) {
        setEsSaldoPrevio(true);
      }
    }
  }, [editTransaction]);

  const isAhorroUSD = form.tipo === 'ahorro' && monedaAhorro === 'USD';
  const canAllocate = !isEdit && (form.tipo === 'ahorro' || form.tipo === 'inversion');
  const activeGoals = goals.filter(g => g.estado === 'en_progreso');

  const rate = rates?.blue ?? 1;
  const montoUSDDisplay = isAhorroUSD
    ? montoRaw.toFixed(2)
    : rates && montoRaw > 0 ? (montoRaw / rate).toFixed(2) : '—';
  const montoARSDisplay = isAhorroUSD
    ? rates && montoRaw > 0 ? (montoRaw * rate).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'
    : null;

  const totalMontoUSD = isAhorroUSD ? montoRaw : (montoRaw > 0 ? montoRaw / rate : 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.montoUSD) || 0), 0);
  const remainingUSD = totalMontoUSD - totalAllocated;

  const availableCategories = form.tipo === 'ingreso' || form.tipo === 'ahorro'
    ? CATEGORIES.ingresos
    : [...CATEGORIES.gastos];

  const handleTipoChange = (tipo: TransactionInput['tipo']) => {
    const defaultCat = tipo === 'ingreso' ? 'Salario' : tipo === 'ahorro' ? 'Ahorro p/viajar' : 'Alimentación';
    const cuenta = tipo === 'ahorro' ? 'Ahorro' : 'Billetera';
    setEsSaldoPrevio(false);
    setMonedaAhorro('ARS');
    setMontoRaw(0);
    setAllocations([]);
    setShowAllocations(false);
    setForm(f => ({ ...f, tipo, categoria: defaultCat, cuenta, montoARS: 0 }));
  };

  const addAllocation = () => {
    const unusedGoal = activeGoals.find(g => !allocations.some(a => a.goalId === g.id));
    setAllocations(prev => [...prev, { goalId: unusedGoal?.id ?? activeGoals[0]?.id ?? '', montoUSD: '' }]);
  };

  const updateAllocation = (i: number, field: keyof AllocationRow, value: string) => {
    setAllocations(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const removeAllocation = (i: number) => {
    setAllocations(prev => prev.filter((_, idx) => idx !== i));
  };

  const distributeEvenly = () => {
    if (allocations.length === 0 || totalMontoUSD <= 0) return;
    const perGoal = (totalMontoUSD / allocations.length).toFixed(2);
    setAllocations(prev => prev.map(a => ({ ...a, montoUSD: perGoal })));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (montoRaw <= 0) { setError('El monto debe ser mayor a 0'); return; }

    if (!isEdit && allocations.length > 0) {
      const hasEmpty = allocations.some(a => !a.goalId || !Number(a.montoUSD));
      if (hasEmpty) { setError('Completá todas las filas de asignación'); return; }
      if (totalAllocated > totalMontoUSD + 0.01) {
        setError(`Asignaste USD ${totalAllocated.toFixed(2)} pero el monto es USD ${totalMontoUSD.toFixed(2)}`);
        return;
      }
    }

    setSaving(true);
    try {
      const montoARS = isAhorroUSD ? Math.round(montoRaw * rate) : montoRaw;
      const payload: any = { ...form, montoARS };

      let desc = form.descripcion || '';
      if (esSaldoPrevio) desc = `[Saldo previo] ${desc}`.trim();
      if (isAhorroUSD) desc = `[USD ${montoRaw}] ${desc}`.trim();
      payload.descripcion = desc || undefined;

      if (!isEdit && allocations.length > 0) {
        payload.allocations = allocations
          .filter(a => a.goalId && Number(a.montoUSD) > 0)
          .map(a => ({ goalId: a.goalId, montoUSD: Number(a.montoUSD) }));
      }

      if (isEdit) {
        await transactionsApi.update(editTransaction!.id, payload);
      } else {
        await transactionsApi.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-surface-800 z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {isEdit ? <Edit2 className="w-5 h-5 text-brand-400" /> : <Plus className="w-5 h-5 text-brand-400" />}
            {isEdit ? 'Editar Transacción' : 'Nueva Transacción'}
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
                      ? tipo === 'gasto' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : tipo === 'ingreso' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : tipo === 'ahorro' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">Monto {isAhorroUSD ? 'USD' : 'ARS'}</label>
              {form.tipo === 'ahorro' && (
                <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                  {(['ARS', 'USD'] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => { setMonedaAhorro(m); setMontoRaw(0); setAllocations([]); }}
                      className={`px-3 py-1 font-medium transition-all ${monedaAhorro === m ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >{m}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">
                {isAhorroUSD ? 'U$D' : '$'}
              </span>
              <input
                type="number" min="0" step={isAhorroUSD ? '0.01' : '1'}
                value={montoRaw || ''}
                onChange={e => setMontoRaw(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:outline-none focus:border-brand-500/50"
                placeholder="0" required
              />
            </div>
            {montoRaw > 0 && (
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {isAhorroUSD
                  ? `≈ ARS $${montoARSDisplay} (BBVA $${Math.round(rate).toLocaleString('es-AR')})`
                  : `≈ USD ${montoUSDDisplay} (BBVA $${Math.round(rate).toLocaleString('es-AR')})`}
              </p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Categoría</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 appearance-none">
              {availableCategories.map(cat => (
                <option key={cat} value={cat} className="bg-surface-800">{cat}</option>
              ))}
            </select>
          </div>

          {/* Fecha y Cuenta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Fecha</label>
              <input type="date" value={form.fecha ?? today}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Cuenta</label>
              <select value={form.cuenta} onChange={e => setForm(f => ({ ...f, cuenta: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm appearance-none">
                {CUENTAS.map(c => <option key={c} value={c} className="bg-surface-800">{c}</option>)}
              </select>
            </div>
          </div>

          {/* Saldo previo */}
          {form.tipo === 'ahorro' && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div onClick={() => setEsSaldoPrevio(v => !v)}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${esSaldoPrevio ? 'bg-blue-500 border-blue-500' : 'border-white/20 bg-white/5 group-hover:border-white/40'}`}>
                {esSaldoPrevio && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div onClick={() => setEsSaldoPrevio(v => !v)}>
                <span className="text-sm text-slate-300">Es saldo previo</span>
                <p className="text-xs text-slate-500">Dinero que ya tenías — no se descuenta de tus ingresos del mes</p>
              </div>
            </label>
          )}

          {/* Goal allocations */}
          {canAllocate && activeGoals.length > 0 && (
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowAllocations(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-400" />
                  Asignar a metas
                  {allocations.length > 0 && (
                    <span className="bg-brand-500/20 text-brand-400 text-xs px-2 py-0.5 rounded-full">{allocations.length}</span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showAllocations ? 'rotate-180' : ''}`} />
              </button>

              {showAllocations && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                  {allocations.length === 0 && <p className="text-xs text-slate-500">Seleccioná a qué meta va este ahorro</p>}
                  {allocations.map((alloc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value={alloc.goalId} onChange={e => updateAllocation(i, 'goalId', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/50 appearance-none">
                        {activeGoals.map(g => <option key={g.id} value={g.id} className="bg-surface-800">{g.nombre}</option>)}
                      </select>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">U$D</span>
                        <input type="number" min="0" step="0.01" value={alloc.montoUSD}
                          onChange={e => updateAllocation(i, 'montoUSD', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-2 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50"
                          placeholder="0" />
                      </div>
                      <button type="button" onClick={() => removeAllocation(i)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {totalMontoUSD > 0 && allocations.length > 0 && (
                    <div className={`text-xs font-mono px-1 pt-1 ${remainingUSD < -0.01 ? 'text-red-400' : remainingUSD > 0.01 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {remainingUSD < -0.01 ? `⚠ Excedés por USD ${Math.abs(remainingUSD).toFixed(2)}`
                        : remainingUSD > 0.01 ? `Sin asignar: USD ${remainingUSD.toFixed(2)}`
                        : '✓ Distribuido completamente'}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={addAllocation} disabled={allocations.length >= activeGoals.length}
                      className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-40">
                      <Plus className="w-3.5 h-3.5" /> Añadir meta
                    </button>
                    {allocations.length > 1 && totalMontoUSD > 0 && (
                      <button type="button" onClick={distributeEvenly} className="text-xs text-slate-400 hover:text-slate-300 transition-colors ml-auto">
                        Distribuir igual
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Descripción (opcional)</label>
            <input type="text" value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 text-sm"
              placeholder="ej: Súper Coto, nafta, etc."
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
