import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Filter } from 'lucide-react';
import Header from '../components/Layout/Header';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import { useApp } from '../context/AppContext';
import { transactionsApi } from '../api/client';
import { ALL_CATEGORIES, CATEGORY_COLORS } from '../types';
import { formatARS, formatUSD, formatDate } from '../utils/formatters';

export default function Transactions() {
  const { transactions, refreshTransactions, refreshSummary } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterTipo && t.tipo !== filterTipo) return false;
      if (filterCat && t.categoria !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.categoria.toLowerCase().includes(q) ||
          (t.descripcion ?? '').toLowerCase().includes(q) ||
          t.cuenta.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, search, filterTipo, filterCat]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    setDeleting(id);
    try {
      await transactionsApi.remove(id);
      refreshTransactions();
      refreshSummary();
    } catch {
      alert('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const handleSuccess = () => {
    refreshTransactions();
    refreshSummary();
  };

  return (
    <>
      <Header
        title="Transacciones"
        subtitle={`${filtered.length} de ${transactions.length} transacciones`}
      />

      <div className="p-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por categoría, descripción o cuenta..."
              className="w-full bg-surface-850 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50"
            />
          </div>

          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="bg-surface-850 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none min-w-[130px]"
          >
            <option value="" className="bg-surface-800">Todos los tipos</option>
            <option value="gasto" className="bg-surface-800">Gastos</option>
            <option value="ingreso" className="bg-surface-800">Ingresos</option>
            <option value="ahorro" className="bg-surface-800">Ahorros</option>
            <option value="inversion" className="bg-surface-800">Inversiones</option>
          </select>

          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="bg-surface-850 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none min-w-[160px]"
          >
            <option value="" className="bg-surface-800">Todas las categorías</option>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-surface-800">{c}</option>
            ))}
          </select>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        </div>

        {/* Table */}
        <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-4 font-medium">Categoría</th>
                  <th className="text-left px-4 py-4 font-medium">Descripción</th>
                  <th className="text-left px-4 py-4 font-medium">Cuenta</th>
                  <th className="text-left px-4 py-4 font-medium">Fecha</th>
                  <th className="text-right px-4 py-4 font-medium">ARS</th>
                  <th className="text-right px-4 py-4 font-medium">USD</th>
                  <th className="text-right px-6 py-4 font-medium">Tipo</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500">
                      {search || filterTipo || filterCat ? 'Sin resultados para este filtro' : 'No hay transacciones aún'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}20`,
                              color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8'
                            }}
                          >
                            {t.categoria.slice(0, 2)}
                          </div>
                          <span className="text-white font-medium">{t.categoria}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">{t.descripcion || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{t.cuenta}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{formatDate(t.fecha)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${
                        t.tipo === 'gasto' ? 'text-red-400' :
                        t.tipo === 'ingreso' ? 'text-emerald-400' :
                        t.tipo === 'ahorro' ? 'text-blue-400' : 'text-purple-400'
                      }`}>
                        {t.tipo === 'gasto' ? '-' : '+'}{formatARS(t.montoARS)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">{formatUSD(t.montoUSD)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          t.tipo === 'gasto' ? 'bg-red-500/10 text-red-400' :
                          t.tipo === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' :
                          t.tipo === 'ahorro' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-purple-500/10 text-purple-400'
                        }`}>
                          {t.tipo === 'inversion' ? 'Inversión' : t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
