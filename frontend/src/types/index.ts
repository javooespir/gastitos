export interface Transaction {
  id: string;
  fecha: string;
  categoria: string;
  montoARS: number;
  montoUSD: number;
  tipo: 'gasto' | 'ingreso' | 'inversion' | 'ahorro';
  descripcion?: string;
  cuenta: string;
  etiquetas: string[];
  createdAt: string;
}

export interface TransactionInput {
  fecha?: string;
  categoria: string;
  montoARS: number;
  tipo: 'gasto' | 'ingreso' | 'inversion' | 'ahorro';
  descripcion?: string;
  cuenta?: string;
  etiquetas?: string[];
}

export interface Goal {
  id: string;
  nombre: string;
  montoObjetivoUSD: number;
  fechaTargetInicio: string;
  fechaTargetFin: string;
  ahorroActualUSD: number;
  recomendacionInversion?: string;
  estado: 'en_progreso' | 'alcanzada';
  createdAt: string;
}

export interface Insight {
  id: string;
  fecha: string;
  tipo: 'alerta' | 'oportunidad' | 'recomendacion';
  categoria: string;
  mensaje: string;
  impacto: 'alto' | 'medio' | 'bajo';
  accion: string;
  leido: boolean;
  createdAt: string;
}

export interface ExchangeRates {
  blue: number;
  oficial: number;
  updatedAt: string;
}

export interface MonthlySummary {
  totalGastadoARS: number;
  totalGastadoUSD: number;
  totalIngresadoARS: number;
  totalIngresadoUSD: number;
  totalAhorradoARS: number;
  totalAhorradoUSD: number;
  categorySums: Record<string, number>;
  transactionCount: number;
}

export interface MonthHistory extends MonthlySummary {
  year: number;
  month: number;
  label: string;
}

export interface AdvisorAnalysis {
  fecha: string;
  resumenMes: {
    gastadoARS: number;
    gastadoUSD: number;
    ingresadoARS: number;
    ingresadoUSD: number;
    ahorroARS: number;
    ahorroUSD: number;
  };
  alertas: Array<{
    tipo: string;
    categoria: string;
    impacto: 'alto' | 'medio' | 'bajo';
    mensaje: string;
    accion: string;
  }>;
  oportunidades: Array<{
    categoria: string;
    gastoActual: number;
    ahorroSiReduces10Pct: string;
    impactoEnMetas: string;
  }>;
  recomendacionesInversion: Record<string, {
    capitalDisponible: string;
    faltaUSD: string;
    usdNeededPerMonth: string;
    estrategia: string;
    razonamiento: string;
    onTrack: boolean;
  }>;
  scoring: {
    disciplina: number;
    consistencia: number;
    eficienciaAhorro: number;
    recomendacion: string;
  };
}

export const CATEGORIES = {
  gastos: [
    'Salud', 'Ocio', 'Casa', 'Café', 'Educación', 'Regalos',
    'Alimentación', 'Familia', 'Rutina', 'Auto', 'Otros', 'Ropa',
    'Salidas', 'Carreras', 'Néstor', 'Helado', 'Tarjeta', 'Crédito',
    'Viajes', 'Efectivo', 'Farmacia'
  ],
  ingresos: ['Ahorro p/viajar', 'Salario', 'Emprendimiento']
} as const;

export const ALL_CATEGORIES = [...CATEGORIES.gastos, ...CATEGORIES.ingresos];
export const CUENTAS = ['Banco', 'Billetera', 'Efectivo', 'Mercado Pago', 'Naranja X', 'Otro'];

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentación': '#f97316',
  'Casa': '#8b5cf6',
  'Salud': '#10b981',
  'Ocio': '#f59e0b',
  'Café': '#a78bfa',
  'Salidas': '#ec4899',
  'Auto': '#6366f1',
  'Ropa': '#14b8a6',
  'Farmacia': '#ef4444',
  'Viajes': '#3b82f6',
  'Educación': '#84cc16',
  'Familia': '#f43f5e',
  'Rutina': '#94a3b8',
  'Tarjeta': '#e11d48',
  'Crédito': '#dc2626',
  'Efectivo': '#78716c',
  'Regalos': '#d946ef',
  'Carreras': '#0891b2',
  'Néstor': '#7c3aed',
  'Helado': '#fb923c',
  'Otros': '#64748b',
  'Salario': '#22c55e',
  'Emprendimiento': '#06b6d4',
  'Ahorro p/viajar': '#a855f7'
};
