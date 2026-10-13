// api/send-to-discord.js
// Función serverless de Vercel. CommonJS a propósito (module.exports, no
// "export default"): así funciona sin añadir "type":"module" a package.json.
// Node 18+ en Vercel ya trae fetch global, no hace falta ninguna dependencia.
//
// El navegador SOLO conoce la ruta "/api/send-to-discord". La URL del
// webhook y el ID para la mención viven en variables de entorno del
// servidor (Vercel → Settings → Environment Variables) y nunca llegan al
// código que se descarga el navegador.

const MAX_LEN = 1500;
const COOLDOWN_MS = 3000; // evita el típico doble clic accidental
const lastSentByIp = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('Falta la variable de entorno DISCORD_WEBHOOK_URL');
    return res.status(500).json({ error: 'El servidor no está configurado todavía' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const message = String((body && body.message) || '').trim().slice(0, MAX_LEN);
  if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

  // Antispam sencillo por IP. No es robusto entre instancias serverless
  // distintas (para eso haría falta Upstash/Vercel KV), pero basta para
  // un formulario personal de bajo tráfico.
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (now - (lastSentByIp.get(ip) || 0) < COOLDOWN_MS) {
    return res.status(429).json({ error: 'Espera unos segundos antes de volver a enviar' });
  }
  lastSentByIp.set(ip, now);

  // ID de tu cuenta de Discord para que te mencione (opcional).
  // Configúralo como DISCORD_MENTION_USER_ID — solo el número, sin "<@...>".
  const mentionId = process.env.DISCORD_MENTION_USER_ID;
  const mentionTag = mentionId ? `<@${mentionId}> ` : '';

  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Mi novia 💗',
        content: `${mentionTag}${message}`,
        // Sin esto, Discord podría disparar @everyone/@here si el mensaje
        // escrito lo contiene. Solo permitimos (si procede) la mención a ti.
        allowed_mentions: mentionId ? { users: [mentionId] } : { parse: [] },
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Discord respondió con error:', r.status, detail);
      return res.status(502).json({ error: 'Discord rechazó el mensaje' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error contactando con Discord:', e);
    return res.status(502).json({ error: 'No se pudo contactar con Discord' });
  }
};
