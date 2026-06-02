import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight, ChevronDown, CreditCard as CreditCardIcon, AlertTriangle } from 'lucide-react';
import Header from '../components/Layout/Header';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import { useApp } from '../context/AppContext';
import { transactionsApi } from '../api/client';
import { ALL_CATEGORIES, CATEGORY_COLORS, Transaction } from '../types';
import { formatARS, formatUSD, formatDate } from '../utils/formatters';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface CardGroup {
  label: string;
  arsTotal: number;
  usdTotal: number;
  arsTxs: Transaction[];
  usdTxs: Transaction[];
}

// Renders credit card transactions as 2 collapsible rows (ARS + USD)
function CreditCardGroupRows({
  group,
  onDelete,
  onDeleteAll,
  onEdit,
  deleting
}: {
  group: CardGroup;
  onDelete: (id: string) => void;
  onDeleteAll: (ids: string[]) => void;
  onEdit: (tx: Transaction) => void;
  deleting: string | null;
}) {
  const [expandARS, setExpandARS] = useState(false);
  const [expandUSD, setExpandUSD] = useState(false);

  const handleDeleteAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = [...group.arsTxs, ...group.usdTxs].map(t => t.id);
    const n = allIds.length;
    if (!confirm(`¿Eliminar las ${n} transacciones de Tarjeta BBVA de este mes? Esta acción no se puede deshacer.`)) return;
    onDeleteAll(allIds);
  };

  return (
    <>
      {/* ARS group row */}
      {group.arsTotal > 0 && (
        <>
          <tr
            onClick={() => setExpandARS(v => !v)}
            className="hover:bg-white/3 cursor-pointer transition-colors border-b border-white/5 group/row"
          >
            <td className="px-6 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-red-500/10 text-red-400">
                  <CreditCardIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-white font-medium">Tarjeta BBVA</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <p className="text-slate-300 text-sm capitalize">Resumen {group.label} · Pesos</p>
              <p className="text-xs text-slate-600">{group.arsTxs.length} movimientos</p>
            </td>
            <td className="px-4 py-3 text-slate-400">Tarjeta BBVA</td>
            <td className="px-4 py-3 text-slate-400 font-mono">—</td>
            <td className="px-4 py-3 text-right font-mono font-semibold text-red-400">
              -{formatARS(group.arsTotal)}
            </td>
            <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">—</td>
            <td className="px-6 py-3 text-right">
              <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400">Gasto</span>
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleDeleteAll}
                  title="Eliminar todo el resumen"
                  className="opacity-0 group-hover/row:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandARS ? 'rotate-180' : ''}`} />
              </div>
            </td>
          </tr>
          {expandARS && group.arsTxs.map(t => (
            <tr key={t.id} className="bg-white/1 hover:bg-white/3 transition-colors group border-b border-white/5">
              <td className="px-6 py-2 pl-16">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                    style={{ backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}20`, color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8' }}>
                    {t.categoria.slice(0, 1)}
                  </div>
                  <span className="text-slate-400 text-xs">{t.categoria}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-slate-500 text-xs max-w-[180px] truncate">{t.descripcion || '—'}</td>
              <td className="px-4 py-2 text-slate-600 text-xs">—</td>
              <td className="px-4 py-2 text-slate-500 font-mono text-xs">{formatDate(t.fecha)}</td>
              <td className="px-4 py-2 text-right font-mono text-xs text-red-400/70">-{formatARS(t.montoARS)}</td>
              <td className="px-4 py-2 text-right text-slate-600 font-mono text-xs">—</td>
              <td className="px-6 py-2"></td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(t); }}
                    className="p-1 rounded text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                    disabled={deleting === t.id}
                    className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </>
      )}

      {/* USD group row */}
      {group.usdTotal > 0 && (
        <>
          <tr
            onClick={() => setExpandUSD(v => !v)}
            className="hover:bg-white/3 cursor-pointer transition-colors border-b border-white/5 group/row"
          >
            <td className="px-6 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400">
                  <CreditCardIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-white font-medium">Tarjeta BBVA</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <p className="text-slate-300 text-sm capitalize">Resumen {group.label} · Dólares</p>
              <p className="text-xs text-slate-600">{group.usdTxs.length} movimientos</p>
            </td>
            <td className="px-4 py-3 text-slate-400">Tarjeta BBVA</td>
            <td className="px-4 py-3 text-slate-400 font-mono">—</td>
            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-500">—</td>
            <td className="px-4 py-3 text-right text-amber-400 font-mono text-sm font-semibold">
              -{formatUSD(group.usdTotal)}
            </td>
            <td className="px-6 py-3 text-right">
              <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">Gasto USD</span>
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandUSD ? 'rotate-180' : ''}`} />
              </div>
            </td>
          </tr>
          {expandUSD && group.usdTxs.map(t => (
            <tr key={t.id} className="bg-white/1 hover:bg-white/3 transition-colors group border-b border-white/5">
              <td className="px-6 py-2 pl-16">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                    style={{ backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}20`, color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8' }}>
                    {t.categoria.slice(0, 1)}
                  </div>
                  <span className="text-slate-400 text-xs">{t.categoria}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-slate-500 text-xs max-w-[180px] truncate">{t.descripcion || '—'}</td>
              <td className="px-4 py-2 text-slate-600 text-xs">—</td>
              <td className="px-4 py-2 text-slate-500 font-mono text-xs">{formatDate(t.fecha)}</td>
              <td className="px-4 py-2 text-right text-slate-600 font-mono text-xs">—</td>
              <td className="px-4 py-2 text-right font-mono text-xs text-amber-400/70">-{formatUSD(t.montoUSD)}</td>
              <td className="px-6 py-2"></td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(t); }}
                    className="p-1 rounded text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                    disabled={deleting === t.id}
                    className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}

export default function Transactions() {
  const { refreshTransactions, refreshSummary } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const fetchTransactions = useCallback(async (y: number, m: number) => {
    setLoadingTx(true);
    try {
      const start = new Date(y, m - 1, 1).toISOString();
      const end = new Date(y, m, 0, 23, 59, 59).toISOString();
      const res = await transactionsApi.list({ startDate: start, endDate: end, limit: 500 });
      setTransactions(res.data.data ?? res.data);
    } catch { /* silent */ } finally { setLoadingTx(false); }
  }, []);

  useEffect(() => { fetchTransactions(year, month); }, [year, month, fetchTransactions]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

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

  // Group credit card transactions into ARS + USD rows when no active filter
  const { cardGroup, otherTxs, showGrouped } = useMemo(() => {
    const noFilters = !search && !filterTipo && !filterCat;
    const cardTxs = filtered.filter(t => t.cuenta === 'Tarjeta BBVA');
    const others = filtered.filter(t => t.cuenta !== 'Tarjeta BBVA');

    if (!noFilters || cardTxs.length === 0) {
      return { cardGroup: null, otherTxs: filtered, showGrouped: false };
    }

    const monthLabel = `${MONTHS_ES[month - 1].toLowerCase()} ${year}`;
    const group: CardGroup = {
      label: monthLabel,
      arsTotal: 0,
      usdTotal: 0,
      arsTxs: [],
      usdTxs: []
    };

    for (const t of cardTxs) {
      if (t.montoARS > 0) { group.arsTotal += t.montoARS; group.arsTxs.push(t); }
      if (t.montoUSD > 0) { group.usdTotal += t.montoUSD; group.usdTxs.push(t); }
    }

    return { cardGroup: group, otherTxs: others, showGrouped: true };
  }, [filtered, search, filterTipo, filterCat, month, year]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    setDeleting(id);
    try {
      await transactionsApi.remove(id);
      refreshTransactions();
      refreshSummary();
      fetchTransactions(year, month);
    } catch {
      alert('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => transactionsApi.remove(id)));
      refreshTransactions();
      refreshSummary();
      fetchTransactions(year, month);
    } catch {
      alert('Error al eliminar el resumen');
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setShowForm(true);
  };

  const handleSuccess = () => {
    refreshTransactions();
    refreshSummary();
    fetchTransactions(year, month);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingTx(undefined);
  };

  const totalRows = showGrouped
    ? otherTxs.length + (cardGroup ? (cardGroup.arsTotal > 0 ? 1 : 0) + (cardGroup.usdTotal > 0 ? 1 : 0) : 0)
    : filtered.length;

  return (
    <>
      <Header
        title="Transacciones"
        subtitle={`${totalRows} filas · ${MONTHS_ES[month - 1]} ${year}`}
      />

      <div className="p-8 space-y-6">
        {/* Month navigator */}
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold text-white capitalize min-w-[140px] text-center">
            {MONTHS_ES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          {loadingTx && <span className="text-xs text-slate-500 animate-pulse ml-2">Cargando...</span>}
        </div>

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

          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="bg-surface-850 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none min-w-[130px]">
            <option value="" className="bg-surface-800">Todos los tipos</option>
            <option value="gasto" className="bg-surface-800">Gastos</option>
            <option value="ingreso" className="bg-surface-800">Ingresos</option>
            <option value="ahorro" className="bg-surface-800">Ahorros</option>
            <option value="inversion" className="bg-surface-800">Inversiones</option>
          </select>

          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="bg-surface-850 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none appearance-none min-w-[160px]">
            <option value="" className="bg-surface-800">Todas las categorías</option>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-surface-800">{c}</option>
            ))}
          </select>

          <button onClick={() => { setEditingTx(undefined); setShowForm(true); }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
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
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500">
                      {search || filterTipo || filterCat ? 'Sin resultados para este filtro' : 'No hay transacciones aún'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Credit card grouped rows (only when no active filter) */}
                    {showGrouped && cardGroup && (
                      <CreditCardGroupRows
                        group={cardGroup}
                        onDelete={handleDelete}
                        onDeleteAll={handleDeleteAll}
                        onEdit={handleEdit}
                        deleting={deleting}
                      />
                    )}

                    {/* Regular transactions */}
                    {otherTxs.map(t => (
                      <tr key={t.id} className="hover:bg-white/2 transition-colors group border-b border-white/5 last:border-0">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: `${CATEGORY_COLORS[t.categoria] ?? '#64748b'}20`, color: CATEGORY_COLORS[t.categoria] ?? '#94a3b8' }}>
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
                            t.tipo === 'ahorro' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {t.tipo === 'inversion' ? 'Inversión' : t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(t)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <TransactionForm
          onClose={handleClose}
          onSuccess={handleSuccess}
          editTransaction={editingTx}
        />
      )}
    </>
  );
}
