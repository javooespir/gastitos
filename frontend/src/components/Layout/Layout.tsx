import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../../context/AppContext';

export default function Layout() {
  const { error, setError } = useApp();

  return (
    <div className="flex min-h-screen bg-surface-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4 text-lg leading-none">&times;</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
