/**
 * Vercel Serverless Function: proxy privado hacia Discord.
 * Configura DISCORD_WEBHOOK_URL en Vercel > Settings > Environment Variables.
 * Nunca uses VITE_DISCORD_WEBHOOK_URL: las variables VITE_* se publican en el bundle del cliente.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  // Evita que otro origen use el endpoint desde un navegador. No sustituye a un rate limiter.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Origen no permitido.' });
      }
    } catch {
      return res.status(400).json({ error: 'Cabecera Origin no válida.' });
    }
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(503).json({ error: 'Discord no está configurado en el servidor.' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: 'El cuerpo JSON no es válido.' });
    }
  }

  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  const source = typeof payload?.source === 'string' ? payload.source.trim().slice(0, 80) : 'Visor anatómico';
  if (!message) return res.status(400).json({ error: 'Escribe un mensaje antes de enviarlo.' });
  if (message.length > 1500) return res.status(413).json({ error: 'El mensaje supera el máximo de 1500 caracteres.' });

  // Validación básica: no aceptamos URLs que no sean webhooks oficiales de Discord.
  let parsedWebhook;
  try {
    parsedWebhook = new URL(webhookUrl);
  } catch {
    return res.status(500).json({ error: 'La URL del webhook no es válida.' });
  }
  if (parsedWebhook.protocol !== 'https:' || !['discord.com', 'discordapp.com'].includes(parsedWebhook.hostname) || !parsedWebhook.pathname.startsWith('/api/webhooks/')) {
    return res.status(500).json({ error: 'La URL configurada no parece ser un webhook de Discord válido.' });
  }

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Visor anatómico',
        content: `**${source || 'Visor anatómico'}**\n${message}`,
        allowed_mentions: { parse: [] },
      }),
    });

    // Los webhooks de Discord suelen responder 204 No Content al enviar correctamente.
    if (!discordResponse.ok) {
      console.error('[api/discord] Discord respondió con estado', discordResponse.status);
      return res.status(502).json({ error: 'Discord no ha aceptado el mensaje.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[api/discord] Error de red al contactar Discord:', error);
    return res.status(502).json({ error: 'No se ha podido conectar con Discord.' });
  }
}
