import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text;
}

/** Parse Argentine number format: "1.234.567,89" → 1234567.89 */
function parseARSNumber(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

/**
 * Extract total taxes directly from PDF text using regex — more reliable than AI for this.
 * BBVA has "Impuestos, cargos e intereses" section(s) with dated lines followed by peso amounts.
 * Returns { totalPesos, fecha } or null if section not found.
 */
function extractTaxesFromText(text: string): { totalPesos: number; fecha: string } | null {
  // Find every occurrence of "Impuestos" section up to "SALDO ACTUAL"
  const taxSectionRegex = /Impuestos[,\s]+cargos\s+e\s+intereses([\s\S]*?)(?=SALDO\s+ACTUAL|TOTAL\s+CONSUMOS|Consumos\s+[A-Z])/gi;
  let totalPesos = 0;
  let lastDate = '';
  let foundAny = false;

  let m: RegExpExecArray | null;
  while ((m = taxSectionRegex.exec(text)) !== null) {
    const section = m[1];
    foundAny = true;

    // Extract date from lines like "28-May-26" or "28/05/26"
    const dateMatch = section.match(/(\d{2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && !lastDate) lastDate = dateMatch[1];

    // Match peso amounts: numbers like "18.044,05" or "235,36" or "16.475,40"
    // We want numbers that appear in the PESOS column (not the DÓLARES column which has small values)
    // Strategy: find all Argentine-format numbers and filter out tiny ones (likely USD amounts < 200)
    const amountRegex = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    let a: RegExpExecArray | null;
    while ((a = amountRegex.exec(section)) !== null) {
      const val = parseARSNumber(a[1]);
      // DÓLARES column amounts are small (< 200); PESOS column amounts are large.
      // Filter out any value that appears to be from the DÓLARES column or is a base for calc
      // Skip if value looks like a calculation base (appears in parentheses in description)
      const surrounding = section.substring(Math.max(0, a.index - 30), a.index + 15);
      const inParentheses = /\(\s*[\d.,]+\s*\)/.test(surrounding.substring(0, 30));
      if (!inParentheses && val >= 50) {
        totalPesos += val;
      }
    }
  }

  if (!foundAny || totalPesos === 0) return null;

  // Convert date to YYYY-MM-DD
  let fechaISO = new Date().toISOString().split('T')[0];
  if (lastDate) {
    const monthMap: Record<string, string> = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    const parts = lastDate.match(/(\d{2})[-/]([A-Za-z]{3})[-/](\d{2,4})/);
    if (parts) {
      const day = parts[1];
      const mon = monthMap[parts[2].toLowerCase()] || '01';
      const yr = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
      fechaISO = `${yr}-${mon}-${day}`;
    }
  }

  return { totalPesos, fecha: fechaISO };
}

async function extractTransactionsWithGroq(pdfText: string, banco: string): Promise<any[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no configurada');

  // Use full text — but limit to 12,000 chars to avoid 413 Payload Too Large errors from Groq
  // Even though llama-3.3-70b has large context, the request payload has limits
  const textToSend = pdfText.length > 12000 ? pdfText.substring(0, 12000) : pdfText;

  const systemPrompt = `Sos un experto en analizar resúmenes de tarjetas de crédito de ${banco} Argentina.
Tu tarea es extraer ÚNICAMENTE los CONSUMOS (compras) del texto. Los impuestos se calculan por separado, NO los incluyas.

Devolvé un JSON array donde cada item tiene EXACTAMENTE este formato:
{"fecha": "YYYY-MM-DD", "descripcion": "nombre del comercio", "monto": 1234.56, "moneda": "ARS", "cuotas": null, "titular": "ESPIR"}

REGLAS:
- fecha: convertí "07-May-26" → "2026-05-07", "10-Abr-26" → "2026-04-10"
- descripcion: nombre limpio del comercio. Sin códigos, sin autorizaciones, sin "NRO.CUPÓN".
  "APPLE.COM BILL MN7Q0FD2SUSD 1,99" → "Apple"
  "MERPAGO*SHELL 000001" → "Shell"
  "AUTOPISTAS URBAN 000000006024318" → "Autopistas Urban"
  "CIA SEG LA MER5168317330101-000-000" → "CIA SEG LA MER"
- moneda: BBVA tiene columna PESOS y columna DÓLARES:
  * Valor en PESOS → moneda: "ARS"
  * Valor en DÓLARES (o descripción dice "USD X,XX") → moneda: "USD", monto en dólares
- cuotas: "C.01/06" → "1/6", pago único → null
- titular: apellido del titular de la sección ("ESPIR", "CEJAS", "MARQUEZ")
- Incluí consumos de TODOS los titulares
- Los montos usan punto como miles y coma como decimal: "33.419,67" → 33419.67
- IGNORÁ: sección "Impuestos, cargos e intereses", pagos (SU PAGO EN PESOS/USD), créditos/devoluciones, cuotas a vencer

Devolvé SOLO el JSON array, sin markdown ni texto adicional.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extraé los consumos de este resumen BBVA:\n\n${textToSend}` }
      ],
      max_tokens: 5000,
      temperature: 0.1
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content ?? '[]';

  try {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean).map((t: any) => ({
      ...t,
      moneda: t.moneda === 'USD' ? 'USD' : 'ARS',
      monto: typeof t.monto === 'number' ? t.monto : parseARSNumber(String(t.monto)),
      titular: t.titular || 'PRINCIPAL'
    }));
  } catch {
    return [];
  }
}

// POST /api/credit-card/parse
router.post('/parse', upload.single('pdf'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo PDF' });
      return;
    }

    const banco = (req.body.banco as string) || 'BBVA';
    const pdfText = await parsePdfBuffer(req.file.buffer);

    if (!pdfText || pdfText.trim().length < 100) {
      res.status(422).json({ error: 'El PDF no contiene texto legible. Puede ser un PDF escaneado.' });
      return;
    }

    // Extract taxes via regex FIRST using the FULL PDF text (no character limit)
    // This ensures we capture ALL tax sections across multiple pages
    const taxes = extractTaxesFromText(pdfText);

    // Extract transactions via AI (consumos only)
    // For Groq, limit to 12,000 chars to avoid 413 Payload Too Large errors
    const transactions = await extractTransactionsWithGroq(pdfText, banco);

    if (taxes && taxes.totalPesos > 0) {
      transactions.push({
        fecha: taxes.fecha,
        descripcion: 'Impuestos y cargos tarjeta',
        monto: Math.round(taxes.totalPesos * 100) / 100,
        moneda: 'ARS',
        cuotas: null,
        titular: 'ESPIR',
        tipo: 'gasto'
      });
    }

    res.json({ transactions, rawTextLength: pdfText.length, taxesExtracted: taxes });
  } catch (err) {
    next(err);
  }
});

export default router;
