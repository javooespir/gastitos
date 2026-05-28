import prisma from '../lib/prisma';
import { ExchangeRates } from '../types';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

async function fetchFromBluelytics(): Promise<{ blue: number; oficial: number }> {
  const res = await fetch('https://api.bluelytics.com.ar/v2/latest');
  if (!res.ok) throw new Error('Bluelytics API error');
  const data = await res.json() as any;
  return {
    blue: (data.blue.value_buy + data.blue.value_sell) / 2,
    oficial: (data.oficial.value_buy + data.oficial.value_sell) / 2
  };
}

async function fetchFromDolarApi(): Promise<{ blue: number; oficial: number }> {
  const [blueRes, oficialRes] = await Promise.all([
    fetch('https://dolarapi.com/v1/dolares/blue'),
    fetch('https://dolarapi.com/v1/dolares/oficial')
  ]);
  const [blueData, oficialData] = await Promise.all([
    blueRes.json() as any,
    oficialRes.json() as any
  ]);
  return {
    blue: blueData.venta ?? blueData.compra ?? 1200,
    oficial: oficialData.venta ?? oficialData.compra ?? 1000
  };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Verificar cache en BD
  const cached = await prisma.exchangeRateCache.findUnique({ where: { id: 'singleton' } });
  if (cached && (Date.now() - cached.updatedAt.getTime()) < CACHE_TTL_MS) {
    return {
      blue: cached.rateBlue,
      oficial: cached.rateOficial,
      updatedAt: cached.updatedAt
    };
  }

  // Intentar APIs en orden
  let rates: { blue: number; oficial: number };
  try {
    rates = await fetchFromBluelytics();
  } catch {
    try {
      rates = await fetchFromDolarApi();
    } catch {
      // Fallback: usar cache vencido si existe
      if (cached) {
        return { blue: cached.rateBlue, oficial: cached.rateOficial, updatedAt: cached.updatedAt };
      }
      rates = { blue: 1200, oficial: 1000 };
    }
  }

  // Guardar en cache
  const updated = await prisma.exchangeRateCache.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', rateBlue: rates.blue, rateOficial: rates.oficial },
    update: { rateBlue: rates.blue, rateOficial: rates.oficial }
  });

  return { blue: updated.rateBlue, oficial: updated.rateOficial, updatedAt: updated.updatedAt };
}

export function arsToUsd(montoARS: number, rateBlue: number): number {
  return Math.round((montoARS / rateBlue) * 100) / 100;
}
