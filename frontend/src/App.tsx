import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Advisor from './pages/Advisor';
import FixedExpenses from './pages/FixedExpenses';
import Loans from './pages/Loans';
import CreditCard from './pages/CreditCard';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="fixed-expenses" element={<FixedExpenses />} />
            <Route path="goals" element={<Goals />} />
            <Route path="loans" element={<Loans />} />
            <Route path="credit-card" element={<CreditCard />} />
            <Route path="advisor" element={<Advisor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
