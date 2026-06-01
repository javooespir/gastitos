import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues with pdf-parse's test file detection
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTransactionsWithGroq(pdfText: string, banco: string): Promise<any[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY no configurada');

  const systemPrompt = `Sos un experto en analizar resúmenes de tarjetas de crédito de ${banco} Argentina.
Tu tarea es extraer TODAS las transacciones del texto y devolver un JSON array.
Cada item debe tener exactamente este formato:
{"fecha": "YYYY-MM-DD", "descripcion": "nombre del comercio o concepto", "monto": 1234.56, "cuotas": "1/3 o null si es una cuota", "tipo": "compra"}
Reglas:
- fecha: convertí DD/MM/YYYY a YYYY-MM-DD. Si no hay año, usá el año del resumen.
- monto: siempre positivo, en ARS. Sin símbolos de moneda.
- descripcion: nombre limpio del comercio, sin códigos ni números de autorización.
- cuotas: si dice "1/12" o "CTA 3/6", ponelo tal cual. Si es pago único, null.
- Ignorá pagos, devoluciones, ajustes de tipo de cambio y cargos de membresía.
- Devolvé SOLO el JSON array, sin texto adicional, sin markdown.`;

  const userMessage = `Extraé las transacciones de este resumen de tarjeta:\n\n${pdfText.substring(0, 8000)}`;

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
    // Strip markdown code fences if present
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
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
