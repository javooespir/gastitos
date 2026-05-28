export interface TransactionInput {
  fecha?: string;
  categoria: string;
  montoARS: number;
  tipo: 'gasto' | 'ingreso' | 'inversion' | 'ahorro';
  descripcion?: string;
  cuenta?: string;
  etiquetas?: string[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoria?: string;
  tipo?: string;
  cuenta?: string;
  page?: number;
  limit?: number;
}

export interface GoalInput {
  nombre: string;
  montoObjetivoUSD: number;
  fechaTargetInicio: string;
  fechaTargetFin: string;
}

export interface ExchangeRates {
  blue: number;
  oficial: number;
  updatedAt: Date;
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
  alertas: Alert[];
  oportunidades: Opportunity[];
  recomendacionesInversion: Record<string, InvestmentRecommendation>;
  scoring: Scoring;
}

export interface Alert {
  tipo: string;
  categoria: string;
  impacto: 'alto' | 'medio' | 'bajo';
  mensaje: string;
  accion: string;
}

export interface Opportunity {
  categoria: string;
  gastoActual: number;
  ahorroSiReduces10Pct: string;
  impactoEnMetas: string;
}

export interface InvestmentRecommendation {
  capitalDisponible: string;
  estrategia: string;
  razonamiento: string;
}

export interface Scoring {
  disciplina: number;
  consistencia: number;
  eficienciaAhorro: number;
  recomendacion: string;
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
