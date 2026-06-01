import { useState, FormEvent } from 'react';
import { Plus, X, TrendingUp, AlertCircle, ChevronDown, CreditCard } from 'lucide-react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { loansApi } from '../api/client';
import { Loan } from '../types';
import { formatARS } from '../utils/formatters';

function LoanCard({ loan, onUpdate }: { loan: Loan; onUpdate: () => void }) {
  const [showPayForm, setShowPayForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [payForm, setPayForm] = useState({
    numeroCuota: (loan.cuotaPagada + 1).toString(),
    montoPagado: loan.montoCuotaActual.toString(),
    saldoActual: loan.saldoActual.toString(),
    fecha: new Date().toISOString().split('T')[0]
  });
  const [editForm, setEditForm] = useState({
    saldoActual: loan.saldoActual.toString(),
    montoCuotaActual: loan.montoCuotaActual.toString(),
    cuotaPagada: loan.cuotaPagada.toString()
  });
  const [saving, setSaving] = useState(false);

  const cuotasRestantes = loan.totalCuotas - loan.cuotaPagada;
  const pct = Math.round((loan.cuotaPagada / loan.totalCuotas) * 100);
  const aumentoPct = loan.montoCuotaOriginal > 0
    ? Math.round(((loan.montoCuotaActual - loan.montoCuotaOriginal) / loan.montoCuotaOriginal) * 100)
    : 0;
  const totalPagadoEstimado = loan.pagos.reduce((s, p) => s + p.montoPagado, 0);

  const handlePago = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await loansApi.registrarPago(loan.id, {
        numeroCuota: Number(payForm.numeroCuota),
        montoPagado: Number(payForm.montoPagado),
        fecha: payForm.fecha,
        saldoActual: Number(payForm.saldoActual)
      });
      onUpdate();
      setShowPayForm(false);
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await loansApi.update(loan.id, {
        saldoActual: Number(editForm.saldoActual),
        montoCuotaActual: Number(editForm.montoCuotaActual),
        cuotaPagada: Number(editForm.cuotaPagada)
      });
      onUpdate();
      setEditing(false);
    } finally { setSaving(false); }
  };

  const tipoLabel: Record<string, string> = { hipotecario: 'Hipotecario', personal: 'Personal', auto: 'Auto', otro: 'Otro' };
  const barColor = pct >= 50 ? '#22c55e' : pct >= 25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{loan.nombre}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded">{tipoLabel[loan.tipo] || loan.tipo}</span>
                {loan.esUVA && <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">UVA {loan.tasaAnual}%</span>}
                {!loan.esUVA && <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded">{loan.tasaAnual}% TNA</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setEditing(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-white/5 hover:border-white/10">
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleEdit} className="space-y-3 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Saldo adeudado</label>
                <input type="number" value={editForm.saldoActual} onChange={e => setEditForm(f => ({ ...f, saldoActual: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cuota actual</label>
                <input type="number" value={editForm.montoCuotaActual} onChange={e => setEditForm(f => ({ ...f, montoCuotaActual: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cuota pagada Nº</label>
                <input type="number" min="0" max={loan.totalCuotas} value={editForm.cuotaPagada} onChange={e => setEditForm(f => ({ ...f, cuotaPagada: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors">
              {saving ? 'Guardando...' : 'Actualizar datos'}
            </button>
          </form>
        ) : null}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Saldo adeudado</p>
              <p className="text-xl font-bold font-mono text-white">{formatARS(loan.saldoActual)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">Cuotas</p>
              <p className="text-lg font-bold font-mono text-white">{loan.cuotaPagada}<span className="text-slate-500 text-sm">/{loan.totalCuotas}</span></p>
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-600 font-mono">{pct}% pagado</span>
            <span className="text-xs text-slate-600">{cuotasRestantes} restantes</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Cuota actual</p>
            <p className="text-sm font-semibold text-white font-mono">{formatARS(loan.montoCuotaActual)}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {aumentoPct > 0
                ? <span className="text-amber-400">+{aumentoPct}% vs cuota 1</span>
                : <span>= cuota 1</span>
              }
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Cuota original</p>
            <p className="text-sm font-semibold text-slate-400 font-mono">{formatARS(loan.montoCuotaOriginal)}</p>
            <p className="text-xs text-slate-600 mt-0.5">Cuota 1 de {loan.totalCuotas}</p>
          </div>
        </div>

        {loan.esUVA && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl mb-4">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">Crédito UVA — la cuota aumenta con la inflación. Actualizá el monto al recibir el resumen.</p>
          </div>
        )}

        {/* Pay button */}
        {!showPayForm ? (
          <button onClick={() => setShowPayForm(true)}
            className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-xl transition-colors border border-emerald-500/20">
            Registrar cuota {loan.cuotaPagada + 1}
          </button>
        ) : (
          <form onSubmit={handlePago} className="space-y-3 p-3 bg-white/3 rounded-xl border border-white/5">
            <p className="text-xs font-medium text-slate-300">Registrar pago</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nº cuota</label>
                <input type="number" min="1" max={loan.totalCuotas} value={payForm.numeroCuota} onChange={e => setPayForm(f => ({ ...f, numeroCuota: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Importe pagado</label>
                <input type="number" min="0" value={payForm.montoPagado} onChange={e => setPayForm(f => ({ ...f, montoPagado: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nuevo saldo</label>
                <input type="number" min="0" value={payForm.saldoActual} onChange={e => setPayForm(f => ({ ...f, saldoActual: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                <input type="date" value={payForm.fecha} onChange={e => setPayForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/50" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm rounded-lg transition-colors">
                {saving ? '...' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => setShowPayForm(false)} className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white text-sm rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* History */}
      {loan.pagos.length > 0 && (
        <div className="border-t border-white/5">
          <button onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Historial de pagos ({loan.pagos.length} cuotas · {formatARS(totalPagadoEstimado)} total)
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          {showHistory && (
            <div className="px-5 pb-4 space-y-1.5">
              {[...loan.pagos].reverse().slice(0, 12).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Cuota {p.numeroCuota}</span>
                  <span className="font-mono text-slate-300">{formatARS(p.montoPagado)}</span>
                  <span className="text-slate-600">{new Date(p.fecha).toLocaleDateString('es-AR')}</span>
                </div>
              ))}
              {loan.pagos.length > 12 && <p className="text-xs text-slate-600">y {loan.pagos.length - 12} más...</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Loans() {
  const { loans, refreshLoans } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '', tipo: 'personal', saldoActual: '', tasaAnual: '',
    esUVA: true, totalCuotas: '', cuotaPagada: '0',
    montoCuotaActual: '', montoCuotaOriginal: '',
    fechaPrimeraCuota: '', diaPago: '10'
  });
  const [saving, setSaving] = useState(false);

  const activeLoans = loans.filter(l => l.estado === 'activo');
  const totalDeuda = activeLoans.reduce((s, l) => s + l.saldoActual, 0);
  const totalCuotaMensual = activeLoans.reduce((s, l) => s + l.montoCuotaActual, 0);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await loansApi.create({
        ...form,
        saldoActual: Number(form.saldoActual),
        tasaAnual: Number(form.tasaAnual),
        esUVA: form.esUVA,
        totalCuotas: Number(form.totalCuotas),
        cuotaPagada: Number(form.cuotaPagada),
        montoCuotaActual: Number(form.montoCuotaActual),
        montoCuotaOriginal: Number(form.montoCuotaOriginal),
        diaPago: Number(form.diaPago)
      });
      refreshLoans();
      setShowForm(false);
      setForm({ nombre: '', tipo: 'personal', saldoActual: '', tasaAnual: '', esUVA: true, totalCuotas: '', cuotaPagada: '0', montoCuotaActual: '', montoCuotaOriginal: '', fechaPrimeraCuota: '', diaPago: '10' });
    } finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Créditos" subtitle={`${activeLoans.length} activos · ${formatARS(totalCuotaMensual)}/mes`} />

      <div className="p-8 space-y-6">
        {/* Summary */}
        {activeLoans.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-850 border border-red-500/10 rounded-2xl p-5">
              <p className="text-xs text-red-400/70 mb-1">Total adeudado</p>
              <p className="text-2xl font-bold font-mono text-red-400">{formatARS(totalDeuda)}</p>
            </div>
            <div className="bg-surface-850 border border-white/5 rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-1">Cuotas este mes</p>
              <p className="text-2xl font-bold font-mono text-white">{formatARS(totalCuotaMensual)}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Agregar crédito
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="text-center py-20">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No hay créditos cargados</p>
            <button onClick={() => setShowForm(true)} className="mt-4 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors">
              Agregar crédito
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeLoans.map(l => <LoanCard key={l.id} loan={l} onUpdate={refreshLoans} />)}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-400" /> Nuevo crédito
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Nombre</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50"
                    placeholder="ej: Hipotecario BBVA" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none appearance-none">
                    <option value="hipotecario" className="bg-surface-800">Hipotecario</option>
                    <option value="personal" className="bg-surface-800">Personal</option>
                    <option value="auto" className="bg-surface-800">Auto</option>
                    <option value="otro" className="bg-surface-800">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Saldo adeudado (ARS)</label>
                  <input type="number" min="0" value={form.saldoActual} onChange={e => setForm(f => ({ ...f, saldoActual: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="0" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Tasa anual %</label>
                  <input type="number" min="0" step="0.1" value={form.tasaAnual} onChange={e => setForm(f => ({ ...f, tasaAnual: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="6.9" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Total cuotas</label>
                  <input type="number" min="1" value={form.totalCuotas} onChange={e => setForm(f => ({ ...f, totalCuotas: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="360" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Cuota pagada Nº</label>
                  <input type="number" min="0" value={form.cuotaPagada} onChange={e => setForm(f => ({ ...f, cuotaPagada: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="9" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Día de pago</label>
                  <input type="number" min="1" max="31" value={form.diaPago} onChange={e => setForm(f => ({ ...f, diaPago: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="10" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Cuota actual (ARS)</label>
                  <input type="number" min="0" value={form.montoCuotaActual} onChange={e => setForm(f => ({ ...f, montoCuotaActual: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="392382" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Cuota original (ARS)</label>
                  <input type="number" min="0" value={form.montoCuotaOriginal} onChange={e => setForm(f => ({ ...f, montoCuotaOriginal: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-brand-500/50" placeholder="304000" required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">Fecha primera cuota</label>
                <input type="date" value={form.fechaPrimeraCuota} onChange={e => setForm(f => ({ ...f, fechaPrimeraCuota: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50" required />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, esUVA: !f.esUVA }))}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${form.esUVA ? 'bg-brand-500 border-brand-500' : 'border-white/20 bg-white/5'}`}>
                  {form.esUVA && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-slate-300" onClick={() => setForm(f => ({ ...f, esUVA: !f.esUVA }))}>Es crédito UVA (ajusta por inflación)</span>
              </label>
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
