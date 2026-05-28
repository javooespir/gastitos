import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Transaction, Goal, Insight, ExchangeRates, MonthlySummary, MonthHistory } from '../types';
import { transactionsApi, goalsApi, advisorApi, exchangeApi } from '../api/client';

interface AppState {
  transactions: Transaction[];
  goals: Goal[];
  insights: Insight[];
  rates: ExchangeRates | null;
  monthlySummary: MonthlySummary | null;
  history: MonthHistory[];
  loading: { transactions: boolean; goals: boolean; insights: boolean; rates: boolean; summary: boolean };
  error: string | null;
}

interface AppContextValue extends AppState {
  refreshTransactions: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  refreshRates: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setError: (err: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    transactions: [],
    goals: [],
    insights: [],
    rates: null,
    monthlySummary: null,
    history: [],
    loading: { transactions: false, goals: false, insights: false, rates: false, summary: false },
    error: null
  });

  const setLoading = (key: keyof AppState['loading'], value: boolean) =>
    setState(s => ({ ...s, loading: { ...s.loading, [key]: value } }));

  const refreshTransactions = useCallback(async () => {
    setLoading('transactions', true);
    try {
      const res = await transactionsApi.list({ limit: 100 });
      setState(s => ({ ...s, transactions: res.data.data, error: null }));
    } catch {
      setState(s => ({ ...s, error: 'Error cargando transacciones' }));
    } finally {
      setLoading('transactions', false);
    }
  }, []);

  const refreshGoals = useCallback(async () => {
    setLoading('goals', true);
    try {
      const res = await goalsApi.list();
      setState(s => ({ ...s, goals: res.data, error: null }));
    } catch {
      setState(s => ({ ...s, error: 'Error cargando metas' }));
    } finally {
      setLoading('goals', false);
    }
  }, []);

  const refreshInsights = useCallback(async () => {
    setLoading('insights', true);
    try {
      const res = await advisorApi.insights();
      setState(s => ({ ...s, insights: res.data, error: null }));
    } catch {
      setState(s => ({ ...s, error: 'Error cargando insights' }));
    } finally {
      setLoading('insights', false);
    }
  }, []);

  const refreshRates = useCallback(async () => {
    setLoading('rates', true);
    try {
      const res = await exchangeApi.rates();
      setState(s => ({ ...s, rates: res.data, error: null }));
    } catch {
      setState(s => ({ ...s, error: 'Error cargando cotizaciones' }));
    } finally {
      setLoading('rates', false);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    setLoading('summary', true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        transactionsApi.monthlySummary(),
        transactionsApi.history()
      ]);
      setState(s => ({ ...s, monthlySummary: summaryRes.data, history: historyRes.data, error: null }));
    } catch {
      setState(s => ({ ...s, error: 'Error cargando resumen' }));
    } finally {
      setLoading('summary', false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshTransactions(),
      refreshGoals(),
      refreshInsights(),
      refreshRates(),
      refreshSummary()
    ]);
  }, [refreshTransactions, refreshGoals, refreshInsights, refreshRates, refreshSummary]);

  const setError = (error: string | null) => setState(s => ({ ...s, error }));

  useEffect(() => { refreshAll(); }, [refreshAll]);

  return (
    <AppContext.Provider value={{ ...state, refreshTransactions, refreshGoals, refreshInsights, refreshRates, refreshSummary, refreshAll, setError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
