import { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, Check, X, AlertCircle, CreditCard as CreditCardIcon, Loader2, Pencil, ChevronDown, History } from 'lucide-react';
import Header from '../components/Layout/Header';
import { creditCardApi, transactionsApi } from '../api/client';
import { CATEGORIES, Transaction } from '../types';
import { formatARS, formatUSD, formatDate } from '../utils/formatters';

interface ParsedTransaction {
  fecha: string;
  descripcion: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  cuotas: string | null;
  tipo: string;
  selected: boolean;
  categoria: string;
  titular: string;
  editing: boolean;
}

interface CardGroup {
  label: string;
  arsTotal: number;
  usdTotal: number;
  arsTxs: Transaction[];
  usdTxs: Transaction[];
}

const ALL_GASTO_CATEGORIES = [...CATEGORIES.gastos];

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function EditableCell({
  value,
  onSave,
  type = 'text',
  className = ''
}: {
  value: string;
  onSave: (v: string) => void;
  type?: 'text' | 'number' | 'date';
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const commit = () => {
    setEditing(false);
    onSave(val);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        className={`bg-white/10 border border-brand-500/50 rounded px-2 py-0.5 text-white text-sm focus:outline-none w-full ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-left hover:text-brand-300 transition-colors group flex items-center gap-1 ${className}`}
      title="Click para editar"
    >
      <span>{value}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 flex-shrink-0" />
    </button>
  );
}

function CardHistoryGroup({
  monthKey,
  group,
  onRefresh
}: {
  monthKey: string;
  group: CardGroup;
  onRefresh: () => void;
}) {
  const [expandARS, setExpandARS] = useState(false);
  const [expandUSD, setExpandUSD] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    setDeletingId(id);
    try {
      await transactionsApi.remove(id);
      onRefresh();
    } catch { alert('Error al eliminar'); } finally { setDeletingId(null); }
  };

  return (
    <div className="border-b border-white/5 last:border-0">
      {/* ARS row */}
      {group.arsTotal > 0 && (
        <>
          <button
            onClick={() => setExpandARS(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCardIcon className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium capitalize">Resumen {group.label} · Pesos</p>
                <p className="text-xs text-slate-500">{group.arsTxs.length} movimientos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400 font-mono text-sm font-semibold">-{formatARS(group.arsTotal)}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${expandARS ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandARS && (
            <div className="bg-white/2 border-t border-white/5 divide-y divide-white/5">
              {group.arsTxs.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-2.5 pl-16 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{t.descripcion || t.categoria}</p>
                    <p className="text-xs text-slate-600">{formatDate(t.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-400/80 font-mono text-sm">-{formatARS(t.montoARS)}</span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* USD row */}
      {group.usdTotal > 0 && (
        <>
          <button
            onClick={() => setExpandUSD(v => !v)}
            className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors text-left ${group.arsTotal > 0 ? 'border-t border-white/5' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCardIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium capitalize">Resumen {group.label} · Dólares</p>
                <p className="text-xs text-slate-500">{group.usdTxs.length} movimientos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-mono text-sm font-semibold">-{formatUSD(group.usdTotal)}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${expandUSD ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandUSD && (
            <div className="bg-white/2 border-t border-white/5 divide-y divide-white/5">
              {group.usdTxs.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-2.5 pl-16 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{t.descripcion || t.categoria}</p>
                    <p className="text-xs text-slate-600">{formatDate(t.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400/80 font-mono text-sm">-{formatUSD(t.montoUSD)}</span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CreditCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [titularFilter, setTitularFilter] = useState<string>('TODOS');

  // Payment month: default = next month
  const defaultPaymentDate = (() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate);

  // History panel
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await transactionsApi.list({ cuenta: 'Tarjeta BBVA', limit: 1000 });
      setHistory(res.data.data ?? res.data);
    } catch { /* silent */ } finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  // Group history by month
  const historyGroups = useMemo(() => {
    const groups: Record<string, CardGroup> = {};
    for (const t of history) {
      const d = new Date(t.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        const m = d.getMonth();
        const y = d.getFullYear();
        groups[key] = {
          label: `${MONTHS_ES[m].toLowerCase()} ${y}`,
          arsTotal: 0,
          usdTotal: 0,
          arsTxs: [],
          usdTxs: []
        };
      }
      if (t.montoARS > 0) {
        groups[key].arsTotal += t.montoARS;
        groups[key].arsTxs.push(t);
      }
      if (t.montoUSD > 0) {
        groups[key].usdTotal += t.montoUSD;
        groups[key].usdTxs.push(t);
      }
    }
    // Sort descending by month
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.pdf')) { setError('Solo se aceptan archivos PDF'); return; }
    setFile(f);
    setTransactions([]);
    setError('');
    setImported(false);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError('');
    try {
      const res = await creditCardApi.parsePdf(file, 'BBVA');
      const parsed: ParsedTransaction[] = (res.data.transactions || []).map((t: any) => ({
        ...t,
        selected: true,
        categoria: t.descripcion?.toLowerCase().includes('impuesto') || t.descripcion?.toLowerCase().includes('cargo') ? 'Impuestos' : 'Otros',
        moneda: t.moneda || 'ARS',
        titular: t.titular || 'PRINCIPAL',
        editing: false
      }));
      if (parsed.length === 0) {
        setError('No se encontraron transacciones en el PDF. Verificá que sea un resumen de BBVA con texto seleccionable.');
      } else {
        setTransactions(parsed);
        const titulares = [...new Set(parsed.map(t => t.titular))];
        setTitularFilter(titulares.length > 1 ? 'TODOS' : titulares[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar el PDF');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const toImport = visibleTransactions.filter(t => t.selected);
    if (toImport.length === 0) { setError('Seleccioná al menos una transacción'); return; }
    setImporting(true);
    try {
      // Use the selected payment month (1st of that month) for all transaction dates
      const [payYear, payMonth] = paymentDate.split('-');
      const payFecha = `${payYear}-${payMonth}-01`;

      await Promise.all(toImport.map(t => {
        const isUSD = t.moneda === 'USD';
        return transactionsApi.create({
          fecha: payFecha,  // use payment month, not original purchase date
          categoria: t.categoria,
          montoARS: isUSD ? 0 : t.monto,
          montoUSD: isUSD ? t.monto : 0,
          tipo: 'gasto',
          descripcion: t.cuotas ? `${t.descripcion} (${t.cuotas})` : t.descripcion,
          cuenta: 'Tarjeta BBVA'
        });
      }));
      setImported(true);
      setTransactions([]);
      setFile(null);
      loadHistory(); // Refresh history panel
    } catch (err: any) {
      setError('Error al importar algunas transacciones');
    } finally {
      setImporting(false);
    }
  };

  const updateField = (i: number, field: keyof ParsedTransaction, value: any) =>
    setTransactions(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const toggle = (i: number) => updateField(i, 'selected', !transactions[i].selected);
  const toggleMoneda = (i: number) =>
    updateField(i, 'moneda', transactions[i].moneda === 'ARS' ? 'USD' : 'ARS');

  const titulares = ['TODOS', ...new Set(transactions.map(t => t.titular))];
  const visibleTransactions = titularFilter === 'TODOS'
    ? transactions
    : transactions.filter(t => t.titular === titularFilter);

  const selected = visibleTransactions.filter(t => t.selected).length;
  const totalARS = visibleTransactions.filter(t => t.selected && t.moneda === 'ARS').reduce((s, t) => s + t.monto, 0);
  const totalUSD = visibleTransactions.filter(t => t.selected && t.moneda === 'USD').reduce((s, t) => s + t.monto, 0);

  // Payment month label
  const [pymYear, pymMonth] = paymentDate.split('-');
  const pymLabel = `${MONTHS_ES[parseInt(pymMonth) - 1]} ${pymYear}`;

  return (
    <>
      <Header title="Tarjeta de Crédito" subtitle="Importá tu resumen de cuenta BBVA" />

      <div className="p-8 space-y-6 max-w-4xl">
        {/* Upload card */}
        <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Importar resumen PDF</h2>
              <p className="text-xs text-slate-500">Solo BBVA Argentina · El texto se procesa con IA (Llama 3)</p>
            </div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-brand-400" />
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · PDF</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-slate-600" />
                <p className="text-sm text-slate-400">Hacé click para subir el PDF del resumen</p>
                <p className="text-xs text-slate-600">O arrastrá el archivo acá</p>
              </div>
            )}
          </div>

          {file && !parsing && transactions.length === 0 && (
            <button onClick={handleParse} className="mt-4 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Procesar PDF con IA
            </button>
          )}

          {parsing && (
            <div className="mt-4 flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              <p className="text-sm text-slate-300">Procesando PDF... puede tardar 10-20 segundos</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {imported && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Check className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-300">¡Transacciones importadas correctamente!</p>
            </div>
          )}
        </div>

        {/* Parsed transactions */}
        {transactions.length > 0 && (
          <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{transactions.length} transacciones encontradas</p>
                  <div className="flex items-center gap-3 mt-1">
                    {totalARS > 0 && (
                      <span className="text-xs text-red-400 font-mono">{formatARS(totalARS)} ARS</span>
                    )}
                    {totalUSD > 0 && (
                      <span className="text-xs text-amber-400 font-mono">{formatUSD(totalUSD)} USD</span>
                    )}
                    <span className="text-xs text-slate-500">({selected} seleccionadas)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => setTransactions(prev => prev.map(t => ({ ...t, selected: true })))}
                      className="text-xs text-slate-400 hover:text-white transition-colors">Todas</button>
                    <button onClick={() => setTransactions(prev => prev.map(t => ({ ...t, selected: false })))}
                      className="text-xs text-slate-400 hover:text-white transition-colors">Ninguna</button>
                  </div>
                  {titulares.length > 2 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {titulares.map(t => (
                        <button
                          key={t}
                          onClick={() => setTitularFilter(t)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            titularFilter === t
                              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                              : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Help text */}
            <div className="px-6 py-2 bg-white/2 border-b border-white/5">
              <p className="text-xs text-slate-500">
                💡 Hacé click en descripción, monto o fecha para editar · Click en el badge de moneda para alternar ARS/USD
              </p>
            </div>

            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {visibleTransactions.map((t, i) => {
                const realIdx = transactions.indexOf(t);
                return (
                  <div key={realIdx} className={`flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors ${!t.selected ? 'opacity-40' : ''}`}>
                    <button onClick={() => toggle(realIdx)}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${t.selected ? 'bg-brand-500 border-brand-500' : 'border-white/20 bg-white/5'}`}>
                      {t.selected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <EditableCell
                        value={t.descripcion}
                        onSave={v => updateField(realIdx, 'descripcion', v)}
                        className="text-sm text-white font-medium"
                      />
                      <div className="flex items-center gap-2 mt-0.5">
                        <EditableCell
                          value={t.fecha}
                          type="date"
                          onSave={v => updateField(realIdx, 'fecha', v)}
                          className="text-xs text-slate-500"
                        />
                        {t.cuotas && <span className="text-xs text-slate-600">· {t.cuotas}</span>}
                        {titularFilter === 'TODOS' && t.titular !== 'PRINCIPAL' && (
                          <span className="text-xs text-slate-600 bg-white/5 rounded px-1">{t.titular}</span>
                        )}
                      </div>
                    </div>

                    <select value={t.categoria} onChange={e => updateField(realIdx, 'categoria', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none appearance-none max-w-[120px]">
                      {ALL_GASTO_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-800">{c}</option>)}
                    </select>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleMoneda(realIdx)}
                        title="Click para cambiar moneda"
                        className={`text-xs font-bold px-1.5 py-0.5 rounded border transition-colors ${
                          t.moneda === 'USD'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {t.moneda}
                      </button>
                      <div className="w-28 text-right">
                        <EditableCell
                          value={t.monto.toString()}
                          type="number"
                          onSave={v => updateField(realIdx, 'monto', parseFloat(v) || 0)}
                          className={`text-sm font-semibold font-mono ${t.moneda === 'USD' ? 'text-amber-400' : 'text-red-400'}`}
                        />
                        <p className="text-xs text-slate-600 font-mono">
                          {t.moneda === 'ARS' ? formatARS(t.monto) : formatUSD(t.monto)}
                        </p>
                      </div>
                    </div>

                    <button onClick={() => updateField(realIdx, 'selected', false)}
                      className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer with payment month + import */}
            <div className="px-6 py-4 border-t border-white/5 space-y-3">
              {/* Payment month selector */}
              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-amber-300">
                    Mes de pago — las transacciones se registrarán en:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="bg-white/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/60"
                    />
                    <span className="text-xs text-amber-400 font-medium capitalize">{pymLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm text-slate-400">
                    Importar <span className="text-white font-semibold">{selected}</span> transacciones
                  </p>
                  <div className="flex items-center gap-3">
                    {totalARS > 0 && (
                      <span className="text-xs font-mono text-red-400">{formatARS(totalARS)} en pesos</span>
                    )}
                    {totalUSD > 0 && (
                      <span className="text-xs font-mono text-amber-400">{formatUSD(totalUSD)} en dólares</span>
                    )}
                  </div>
                </div>
                <button onClick={handleImport} disabled={importing || selected === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {importing ? 'Importando...' : 'Confirmar importación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History panel */}
        <div className="bg-surface-850 border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">Resúmenes importados</h3>
            </div>
            {loadingHistory && <Loader2 className="w-4 h-4 animate-spin text-brand-400" />}
          </div>
          {historyGroups.length === 0 && !loadingHistory ? (
            <p className="text-slate-500 text-sm px-6 py-10 text-center">No hay resúmenes importados aún</p>
          ) : (
            <div>
              {historyGroups.map(([key, group]) => (
                <CardHistoryGroup
                  key={key}
                  monthKey={key}
                  group={group}
                  onRefresh={loadHistory}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500" /> ¿Cómo funciona?
          </h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">1.</span> Descargá el PDF del resumen desde la app o web de BBVA</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">2.</span> Subilo acá — el texto se extrae localmente</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">3.</span> La IA identifica fecha, comercio, monto y moneda (ARS o USD)</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">4.</span> Elegí el <strong className="text-slate-300">mes de pago</strong> (por defecto el mes siguiente), editá lo que necesites y confirmás</li>
          </ol>
          <p className="text-xs text-slate-600 mt-3">⚠ Solo funciona con PDFs que tienen texto seleccionable. Los PDFs escaneados (imagen) no son compatibles.</p>
        </div>
      </div>
    </>
  );
}
