import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTransactionsWithGroq(pdfText: string, banco: string): Promise<any[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no configurada');

  const systemPrompt = `Sos un experto en analizar resúmenes de tarjetas de crédito de ${banco} Argentina.
Tu tarea es extraer TODAS las transacciones de consumo del texto y devolver un JSON array.

Cada item debe tener EXACTAMENTE este formato:
{"fecha": "YYYY-MM-DD", "descripcion": "nombre del comercio", "monto": 1234.56, "moneda": "ARS", "cuotas": null, "titular": "JAVIER"}

REGLAS CRÍTICAS:
- fecha: convertí "07-May-26" → "2026-05-07", "10-Abr-26" → "2026-04-10", etc.
- descripcion: solo el nombre del comercio/servicio, limpio. Sin códigos de autorización, sin NRO de cupón, sin letras/números de autorización como "MN7Q0FD2S".
  Ejemplos: "APPLE.COM BILL" → "Apple", "MERPAGO*SHELL" → "Shell", "AUTOPISTAS URBAN" → "Autopistas Urban", "CIA SEG LA MER5168317330101-000-000" → "CIA SEG LA MER"
- moneda y monto: CRÍTICO - en BBVA los resúmenes tienen columna PESOS y columna DÓLARES:
  * Si el monto está en la columna PESOS → moneda: "ARS", monto: valor en pesos (ej: 33419.67)
  * Si el monto está en la columna DÓLARES, O la descripción dice "USD X,XX" al final → moneda: "USD", monto: valor en dólares (ej: 1.99)
  * Señales de que es USD: descripción termina en "USD 3,98" o "USD 1,99", o el número es pequeño (menos de 100) y aparece en columna DÓLARES
- cuotas: si dice "C.01/06" → "1/6", "C.02/03" → "2/3", pago único → null
- titular: si el resumen tiene secciones por nombre, indicá el apellido del titular (ej: "ESPIR", "CEJAS", "MARQUEZ"). Si no hay secciones, "PRINCIPAL"
- Incluí consumos de TODOS los titulares (principal y adicionales)
- Ignorá: pagos realizados (SU PAGO EN PESOS/USD), créditos/devoluciones (CR.RG), impuestos, intereses, cargos bancarios, membresías, cuotas a vencer
- Los montos en el PDF usan punto como separador de miles y coma como decimal: "33.419,67" → 33419.67
- Devolvé SOLO el JSON array, sin texto adicional, sin markdown, sin explicaciones.`;

  const userMessage = `Extraé las transacciones de este resumen de tarjeta BBVA Argentina:\n\n${pdfText.substring(0, 10000)}`;

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
        { role: 'user', content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.1
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json() as any;
  const content = data.choices?.[0]?.message?.content ?? '[]';

  try {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    // Normalize: ensure moneda field exists, default to ARS
    return parsed.map((t: any) => ({
      ...t,
      moneda: t.moneda === 'USD' ? 'USD' : 'ARS',
      monto: typeof t.monto === 'number' ? t.monto : parseFloat(String(t.monto).replace(/\./g, '').replace(',', '.')),
      titular: t.titular || 'PRINCIPAL'
    }));
  } catch {
    return [];
  }
}

// POST /api/credit-card/parse — upload PDF and extract transactions
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

    const transactions = await extractTransactionsWithGroq(pdfText, banco);
    res.json({ transactions, rawTextLength: pdfText.length });
  } catch (err) {
    next(err);
  }
});

export default router;
