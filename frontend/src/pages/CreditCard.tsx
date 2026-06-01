import { useState, useRef } from 'react';
import { Upload, FileText, Check, X, AlertCircle, CreditCard as CreditCardIcon, Loader2 } from 'lucide-react';
import Header from '../components/Layout/Header';
import { creditCardApi, transactionsApi } from '../api/client';
import { CATEGORIES } from '../types';
import { formatARS } from '../utils/formatters';

interface ParsedTransaction {
  fecha: string;
  descripcion: string;
  monto: number;
  cuotas: string | null;
  tipo: string;
  selected: boolean;
  categoria: string;
}

const ALL_GASTO_CATEGORIES = [...CATEGORIES.gastos];

export default function CreditCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);

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
        categoria: 'Otros'
      }));
      if (parsed.length === 0) {
        setError('No se encontraron transacciones en el PDF. Verificá que sea un resumen de BBVA con texto seleccionable.');
      } else {
        setTransactions(parsed);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar el PDF');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const toImport = transactions.filter(t => t.selected);
    if (toImport.length === 0) { setError('Seleccioná al menos una transacción'); return; }
    setImporting(true);
    try {
      await Promise.all(toImport.map(t => transactionsApi.create({
        fecha: t.fecha,
        categoria: t.categoria,
        montoARS: t.monto,
        tipo: 'gasto',
        descripcion: t.cuotas ? `${t.descripcion} (${t.cuotas})` : t.descripcion,
        cuenta: 'Billetera'
      })));
      setImported(true);
      setTransactions([]);
      setFile(null);
    } catch (err: any) {
      setError('Error al importar algunas transacciones');
    } finally {
      setImporting(false);
    }
  };

  const toggle = (i: number) => setTransactions(prev => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t));
  const updateField = (i: number, field: keyof ParsedTransaction, value: any) =>
    setTransactions(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const selected = transactions.filter(t => t.selected).length;
  const totalSelected = transactions.filter(t => t.selected).reduce((s, t) => s + t.monto, 0);

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
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">{transactions.length} transacciones encontradas</p>
                <p className="text-xs text-slate-500 mt-0.5">{selected} seleccionadas · {formatARS(totalSelected)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTransactions(prev => prev.map(t => ({ ...t, selected: true })))}
                  className="text-xs text-slate-400 hover:text-white transition-colors">Todas</button>
                <button onClick={() => setTransactions(prev => prev.map(t => ({ ...t, selected: false })))}
                  className="text-xs text-slate-400 hover:text-white transition-colors">Ninguna</button>
              </div>
            </div>

            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {transactions.map((t, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors ${!t.selected ? 'opacity-50' : ''}`}>
                  <button onClick={() => toggle(i)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${t.selected ? 'bg-brand-500 border-brand-500' : 'border-white/20 bg-white/5'}`}>
                    {t.selected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.descripcion}</p>
                    <p className="text-xs text-slate-500">{t.fecha}{t.cuotas ? ` · ${t.cuotas}` : ''}</p>
                  </div>

                  <select value={t.categoria} onChange={e => updateField(i, 'categoria', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none appearance-none max-w-[130px]">
                    {ALL_GASTO_CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-800">{c}</option>)}
                  </select>

                  <p className="text-sm font-mono font-semibold text-red-400 flex-shrink-0 w-28 text-right">{formatARS(t.monto)}</p>

                  <button onClick={() => updateField(i, 'selected', false)}
                    className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Importar <span className="text-white font-semibold">{selected}</span> transacciones · <span className="font-mono text-red-400">{formatARS(totalSelected)}</span>
              </p>
              <button onClick={handleImport} disabled={importing || selected === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {importing ? 'Importando...' : 'Confirmar importación'}
              </button>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500" /> ¿Cómo funciona?
          </h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">1.</span> Descargá el PDF del resumen desde la app o web de BBVA</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">2.</span> Subilo acá — el texto se extrae localmente</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">3.</span> La IA (Llama 3) identifica cada compra con fecha, comercio y monto</li>
            <li className="flex gap-2"><span className="text-brand-400 font-mono font-bold">4.</span> Revisás, asignás categorías y confirmás cuáles importar</li>
          </ol>
          <p className="text-xs text-slate-600 mt-3">⚠ Solo funciona con PDFs que tienen texto seleccionable. Los PDFs escaneados (imagen) no son compatibles.</p>
        </div>
      </div>
    </>
  );
}
