import { RefreshCw, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { rates, refreshAll, loading } = useApp();
  const isRefreshing = Object.values(loading).some(Boolean);

  return (
    <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-surface-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {rates && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-mono">
                Blue: <strong className="text-white">${Math.round(rates.blue).toLocaleString('es-AR')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300 font-mono">
                Oficial: <strong className="text-white">${Math.round(rates.oficial).toLocaleString('es-AR')}</strong>
              </span>
            </div>
          </div>
        )}

        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}
