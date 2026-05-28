import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Target, Brain, TrendingUp, Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/goals', label: 'Metas', icon: Target },
  { to: '/advisor', label: 'Asesor IA', icon: Brain },
];

export default function Sidebar() {
  const { insights } = useApp();
  const unread = insights.filter(i => !i.leido).length;

  return (
    <aside className="w-64 bg-surface-850 border-r border-white/5 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Gastitos</p>
            <p className="text-xs text-slate-400">Control Financiero</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {label === 'Asesor IA' && unread > 0 && (
              <span className="ml-auto bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Javier · Castelar, BA</span>
        </div>
      </div>
    </aside>
  );
}
