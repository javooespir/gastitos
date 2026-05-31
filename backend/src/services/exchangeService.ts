import prisma from '../lib/prisma';
import { ExchangeRates } from '../types';

const CACHE_TTL_MS = 23 * 60 * 60 * 1000; // 23 horas (el cron actualiza a las 11am)

// --- Fuentes de tipo de cambio ---

async function fetchFromBBVA(): Promise<number> {
  const res = await fetch(
    'https://www.bbva.com.ar/personas/productos/inversiones/cotizacion-moneda-extranjera.html',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9'
      },
      signal: AbortSignal.timeout(8000)
    }
  );

  if (!res.ok) throw new Error(`BBVA HTTP ${res.status}`);
  const html = await res.text();

  // BBVA usa Next.js — extraer __NEXT_DATA__ con los datos del servidor
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const usdVenta = extractUSDVenta(data);
    if (usdVenta) return usdVenta;
  }

  // Fallback: buscar patrones numéricos en el HTML cerca de "USD" y "venta"
  const htmlLower = html.toLowerCase();
  const patterns = [
    /usd[\s\S]{0,300}?venta[\s\S]{0,80}?([\d]{3,4}(?:[,\.]\d{1,2})?)/gi,
    /"venta"\s*:\s*"?([\d]{3,4}(?:[.,]\d{1,2})?)"?/gi,
    /Venta[\s\S]{0,20}?([\d]{3,4}(?:[,\.]\d{1,2})?)/g
  ];

  for (const pattern of patterns) {
    const m = pattern.exec(html);
    if (m) {
      const val = parseFloat(m[1].replace(',', '.'));
      if (val > 800 && val < 6000) return val;
    }
  }

  throw new Error('BBVA: No se encontró cotización USD venta en el HTML');
}

/** Búsqueda recursiva de un valor USD venta en un objeto JSON */
function extractUSDVenta(obj: any, depth = 0): number | null {
  if (depth > 10 || obj === null || typeof obj !== 'object') return null;

  const objStr = typeof obj === 'object' ? JSON.stringify(obj).toLowerCase() : '';

  // Si el objeto contiene "usd" y "venta", buscar el valor
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj).map(k => k.toLowerCase());

    // Verificar si este objeto tiene moneda=USD o similar
    const isUSD = objStr.includes('"usd"') || objStr.includes("'usd'") ||
      Object.values(obj).some(v => typeof v === 'string' && v.toLowerCase() === 'usd');

    if (isUSD) {
      for (const key of Object.keys(obj)) {
        if (['venta', 'sell', 'sale', 'ask'].includes(key.toLowerCase())) {
          const val = parseFloat(String(obj[key]));
          if (!isNaN(val) && val > 800 && val < 6000) return val;
        }
      }
    }
  }

  // Recursar en arrays y objetos
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const found = extractUSDVenta(val, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

async function fetchFromDolarApi(): Promise<number> {
  const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error('DolarApi error');
  const data = await res.json() as any;
  const venta = data.venta ?? data.compra;
  if (!venta || venta < 800) throw new Error('DolarApi: valor inválido');
  return venta;
}

async function fetchFromBluelytics(): Promise<number> {
  const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error('Bluelytics error');
  const data = await res.json() as any;
  return data.oficial.value_sell ?? data.oficial.value_buy ?? 1200;
}

// --- Lógica principal ---

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Verificar cache
  const cached = await prisma.exchangeRateCache.findUnique({ where: { id: 'singleton' } });
  if (cached && (Date.now() - cached.updatedAt.getTime()) < CACHE_TTL_MS) {
    return { blue: cached.rateBlue, oficial: cached.rateOficial, updatedAt: cached.updatedAt };
  }

  return refreshRates();
}

export async function refreshRates(): Promise<ExchangeRates> {
  let usdVenta: number;
  let source = 'bbva';

  try {
    usdVenta = await fetchFromBBVA();
  } catch (e1) {
    source = 'dolarapi';
    try {
      usdVenta = await fetchFromDolarApi();
    } catch (e2) {
      source = 'bluelytics';
      try {
        usdVenta = await fetchFromBluelytics();
      } catch {
        // Ultimo fallback: usar cache vencido
        const cached = await prisma.exchangeRateCache.findUnique({ where: { id: 'singleton' } });
        if (cached) return { blue: cached.rateBlue, oficial: cached.rateOficial, updatedAt: cached.updatedAt };
        usdVenta = 1200;
        source = 'hardcoded';
      }
    }
  }

  console.log(`[exchange] Cotización USD venta: $${usdVenta} (fuente: ${source})`);

  const updated = await prisma.exchangeRateCache.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', rateBlue: usdVenta, rateOficial: usdVenta },
    update: { rateBlue: usdVenta, rateOficial: usdVenta }
  });

  return { blue: updated.rateBlue, oficial: updated.rateOficial, updatedAt: updated.updatedAt };
}

export function arsToUsd(montoARS: number, rate: number): number {
  return Math.round((montoARS / rate) * 100) / 100;
}
