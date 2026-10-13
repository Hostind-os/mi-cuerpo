// Función serverless de Vercel: reenvía el mensaje a un webhook de Discord.
// Configura la variable de entorno DISCORD_WEBHOOK_URL en Vercel (Settings > Environment Variables).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: 'Falta DISCORD_WEBHOOK_URL' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const message = String((body && body.message) || '').trim().slice(0, 1500);
  if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Mi novia 💗',
        content: message,
        allowed_mentions: { parse: [] } // evita @everyone y menciones
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'Discord rechazó el mensaje' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo contactar con Discord' });
  }
};
