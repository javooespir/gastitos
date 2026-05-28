import Anthropic from '@anthropic-ai/sdk';
import prisma from '../lib/prisma';
import { getMonthlySummary, getLast6MonthsSummary } from './transactionService';
import { getExchangeRates } from './exchangeService';
import { AdvisorAnalysis, Alert, Opportunity } from '../types';

function getClient(): Anthropic {
  const key = process.env.CLAUDE_API_KEY;
  if (!key || key === 'sk-ant-your-key-here') {
    throw new Error('CLAUDE_API_KEY no configurada. Edita backend/.env con tu clave real.');
  }
  return new Anthropic({ apiKey: key });
}

async function saveInsights(analysis: AdvisorAnalysis) {
  const insightsToCreate = [
    ...analysis.alertas.map(a => ({
      tipo: 'alerta',
      categoria: a.categoria,
      mensaje: a.mensaje,
      impacto: a.impacto,
      accion: a.accion
    })),
    ...analysis.oportunidades.slice(0, 3).map(o => ({
      tipo: 'oportunidad',
      categoria: o.categoria,
      mensaje: `Reduciendo Gasto en ${o.categoria} un 10%, ahorrás ${o.ahorroSiReduces10Pct}`,
      impacto: 'medio' as const,
      accion: o.impactoEnMetas
    }))
  ];

  for (const ins of insightsToCreate) {
    await prisma.insight.create({ data: ins });
  }
}

export async function generateAnalysis(): Promise<AdvisorAnalysis> {
  const now = new Date();
  const [currentMonth, history, rates] = await Promise.all([
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
    getLast6MonthsSummary(),
    getExchangeRates()
  ]);

  // Calcular promedio histórico por categoría (últimos 5 meses)
  const prevMonths = history.slice(0, 5);
  const avgByCategory: Record<string, number> = {};
  for (const month of prevMonths) {
    for (const [cat, sum] of Object.entries(month.categorySums) as [string, number][]) {
      avgByCategory[cat] = (avgByCategory[cat] ?? 0) + sum;
    }
  }
  for (const cat of Object.keys(avgByCategory)) {
    avgByCategory[cat] = avgByCategory[cat] / prevMonths.length;
  }

  // Detectar alertas localmente (sin IA) para respuesta rápida
  const alertas: Alert[] = [];
  for (const [cat, sum] of Object.entries(currentMonth.categorySums)) {
    const avg = avgByCategory[cat] ?? 0;
    if (avg > 0 && sum > avg * 1.2) {
      const pct = Math.round(((sum - avg) / avg) * 100);
      alertas.push({
        tipo: 'aumento_categoria',
        categoria: cat,
        impacto: pct > 50 ? 'alto' : pct > 25 ? 'medio' : 'bajo',
        mensaje: `${cat} subió ${pct}% vs promedio. Este mes: $${sum.toLocaleString('es-AR')}, promedio: $${Math.round(avg).toLocaleString('es-AR')}`,
        accion: `Reducir $${Math.round((sum - avg) * 0.5).toLocaleString('es-AR')} esta semana`
      });
    }
  }

  // Oportunidades de ahorro
  const sortedCategories = Object.entries(currentMonth.categorySums)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const oportunidades: Opportunity[] = sortedCategories.map(([cat, sum]) => ({
    categoria: cat,
    gastoActual: sum,
    ahorroSiReduces10Pct: `$${Math.round(sum * 0.1).toLocaleString('es-AR')}`,
    impactoEnMetas: `Reduciendo 10% en ${cat}, ahorrás $${Math.round(sum * 0.1).toLocaleString('es-AR')} por mes`
  }));

  // Metas activas
  const goals = await prisma.goal.findMany({ where: { estado: 'en_progreso' } });
  const recomendaciones: Record<string, any> = {};

  const ahorroMensualUSD = currentMonth.totalAhorradoUSD;

  for (const goal of goals) {
    const monthsRemaining = Math.max(1,
      Math.ceil((goal.fechaTargetFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    );
    const faltaUSD = Math.max(0, goal.montoObjetivoUSD - goal.ahorroActualUSD);
    const usdNeededPerMonth = faltaUSD / monthsRemaining;

    let estrategia: string;
    let razonamiento: string;

    if (monthsRemaining <= 12) {
      estrategia = 'Plazo fijo 30-60 días al 30% anual + 5% en CEDEARs SPY';
      razonamiento = `Horizonte ${monthsRemaining} meses = bajo riesgo. Priorizá liquidez.`;
    } else if (monthsRemaining <= 36) {
      estrategia = 'Mix 60% Plazo Fijo renovable + 40% Acciones locales (FCI)';
      razonamiento = `Horizonte ${monthsRemaining} meses = riesgo moderado. Diversificá para mayor retorno.`;
    } else {
      estrategia = 'Mix 40% Plazo Fijo + 40% Activos locales + 20% Internacional (CEDEARs)';
      razonamiento = `Horizonte ${monthsRemaining} meses = podés asumir más riesgo para mayor crecimiento.`;
    }

    recomendaciones[goal.nombre] = {
      capitalDisponible: `${goal.ahorroActualUSD.toFixed(0)} USD`,
      faltaUSD: faltaUSD.toFixed(0),
      usdNeededPerMonth: usdNeededPerMonth.toFixed(0),
      estrategia,
      razonamiento,
      onTrack: ahorroMensualUSD >= usdNeededPerMonth
    };
  }

  // Scoring
  const ahorroRate = currentMonth.totalIngresadoARS > 0
    ? currentMonth.totalAhorradoARS / currentMonth.totalIngresadoARS
    : 0;

  const disciplina = Math.min(10, Math.round(ahorroRate * 10 + alertas.filter(a => a.impacto === 'bajo').length));
  const consistencia = Math.min(10, Math.max(1, 10 - alertas.filter(a => a.impacto === 'alto').length * 2));
  const eficienciaAhorro = Math.min(10, Math.round(ahorroRate * 15));

  const analysis: AdvisorAnalysis = {
    fecha: now.toISOString(),
    resumenMes: {
      gastadoARS: currentMonth.totalGastadoARS,
      gastadoUSD: currentMonth.totalGastadoUSD,
      ingresadoARS: currentMonth.totalIngresadoARS,
      ingresadoUSD: currentMonth.totalIngresadoUSD,
      ahorroARS: currentMonth.totalAhorradoARS,
      ahorroUSD: currentMonth.totalAhorradoUSD
    },
    alertas: alertas.sort((a, b) =>
      ['alto', 'medio', 'bajo'].indexOf(a.impacto) - ['alto', 'medio', 'bajo'].indexOf(b.impacto)
    ),
    oportunidades,
    recomendacionesInversion: recomendaciones,
    scoring: {
      disciplina: Math.max(1, disciplina),
      consistencia: Math.max(1, consistencia),
      eficienciaAhorro: Math.max(1, eficienciaAhorro),
      recomendacion: getScoreMessage(disciplina, consistencia, eficienciaAhorro, goals.length > 0)
    }
  };

  await saveInsights(analysis);
  return analysis;
}

function getScoreMessage(d: number, c: number, e: number, hasMetas: boolean): string {
  const avg = (d + c + e) / 3;
  if (avg >= 8) return hasMetas ? 'Excelente ritmo. Vas a alcanzar tus metas antes de lo previsto.' : 'Excelente manejo financiero. Considera establecer metas de ahorro.';
  if (avg >= 6) return 'Buen ritmo. Pequeños ajustes en gastos variables pueden mejorar mucho tu situación.';
  if (avg >= 4) return 'Ritmo moderado. Revisá las categorías con más gasto y buscá reducir un 10%.';
  return 'Momento de revisar tus hábitos. El asesor detectó oportunidades importantes de mejora.';
}

export async function chatWithAdvisor(userMessage: string): Promise<string> {
  const key = process.env.CLAUDE_API_KEY;
  if (!key || key === 'sk-ant-your-key-here') {
    return 'El asesor IA no está configurado. Agregá tu CLAUDE_API_KEY para habilitar el chat con el asesor.';
  }
  const client = getClient();

  const now = new Date();
  const [currentMonth, rates, goals] = await Promise.all([
    getMonthlySummary(now.getFullYear(), now.getMonth() + 1),
    getExchangeRates(),
    prisma.goal.findMany()
  ]);

  const context = `
Sos un asesor financiero personal experto en Argentina. El usuario se llama Javier y vive en Castelar, Buenos Aires.

CONTEXTO FINANCIERO ACTUAL (${now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}):
- Dólar blue: $${rates.blue.toFixed(0)} ARS
- Dólar oficial: $${rates.oficial.toFixed(0)} ARS
- Gastos del mes: $${currentMonth.totalGastadoARS.toLocaleString('es-AR')} ARS (USD ${currentMonth.totalGastadoUSD.toFixed(0)})
- Ingresos del mes: $${currentMonth.totalIngresadoARS.toLocaleString('es-AR')} ARS
- Ahorro del mes: $${currentMonth.totalAhorradoARS.toLocaleString('es-AR')} ARS (USD ${currentMonth.totalAhorradoUSD.toFixed(0)})
- Top categorías de gasto: ${Object.entries(currentMonth.categorySums).sort(([,a],[,b]) => b-a).slice(0,5).map(([c,s]) => `${c}: $${s.toLocaleString('es-AR')}`).join(', ')}
- Metas activas: ${goals.map(g => `${g.nombre} (${g.ahorroActualUSD.toFixed(0)}/${g.montoObjetivoUSD} USD)`).join(', ') || 'Ninguna'}

Respondé en español argentino, de forma directa y práctica. Usá números reales del contexto. Máximo 3-4 oraciones a menos que el usuario pida más detalle.
`.trim();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: context,
    messages: [{ role: 'user', content: userMessage }]
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : 'No pude procesar tu consulta.';
}

export async function getRecentInsights(limit = 10) {
  return prisma.insight.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function markInsightRead(id: string) {
  return prisma.insight.update({ where: { id }, data: { leido: true } });
}
