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
Tu tarea es extraer TODAS las transacciones de consumo Y los impuestos/cargos del texto y devolver un JSON array.

Cada item debe tener EXACTAMENTE este formato:
{"fecha": "YYYY-MM-DD", "descripcion": "nombre del comercio", "monto": 1234.56, "moneda": "ARS", "cuotas": null, "titular": "ESPIR"}

REGLAS CRÍTICAS:

1. CONSUMOS: Extraé cada compra individual de todas las secciones "Consumos NOMBRE":
   - descripcion: solo el nombre del comercio/servicio, limpio. Sin códigos de autorización, sin NRO de cupón.
     Ejemplos: "APPLE.COM BILL MN7Q0FD2SUSD 1,99" → "Apple", "MERPAGO*SHELL" → "Shell", "AUTOPISTAS URBAN 000000006024318" → "Autopistas Urban", "CIA SEG LA MER5168317330101-000-000" → "CIA SEG LA MER"
   - moneda y monto CRÍTICO - BBVA tiene columna PESOS y columna DÓLARES:
     * Monto en columna PESOS → moneda: "ARS", usar ese valor
     * Monto en columna DÓLARES, O descripción termina en "USD X,XX" → moneda: "USD", usar el valor en dólares
   - cuotas: "C.01/06" → "1/6", "C.02/03" → "2/3", pago único → null
   - titular: apellido del titular de la sección (ej: "ESPIR", "CEJAS", "MARQUEZ")

2. IMPUESTOS Y CARGOS: Buscá la sección "Impuestos, cargos e intereses".
   - Sumá TODOS los montos en PESOS de esa sección en UNA SOLA transacción:
     * descripcion: "Impuestos y cargos tarjeta"
     * monto: suma total de todos los ítems de esa sección (IMPUESTO DE SELLOS + INTERESES + IVA + IIBB + DB.RG, etc.)
     * moneda: "ARS"
     * cuotas: null
     * titular: "ESPIR"
     * fecha: usar la fecha de cierre del resumen (la que aparece como "CIERRE ACTUAL")
   - Ignorá los montos en DÓLARES de esa sección.

3. IGNORÁ siempre: pagos realizados (SU PAGO EN PESOS/USD), créditos/devoluciones (CR.RG), cuotas a vencer futuras.

4. Los montos en el PDF usan punto como separador de miles y coma como decimal: "33.419,67" → 33419.67

Devolvé SOLO el JSON array, sin texto adicional, sin markdown, sin explicaciones.`;

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
