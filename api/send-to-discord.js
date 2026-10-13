module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: 'Falta DISCORD_WEBHOOK_URL' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const message = String((body && body.message) || '').trim().slice(0, 1500);
  if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

  // Tu ID de Discord configurado para la mención
  const miId = '<@1060945472577089658>'; 

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Mi novia 💗',
        content: `${miId} ${message}`,
        allowed_mentions: { users: ["1060945472577089658"] }
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'Discord rechazó el mensaje' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'No se pudo contactar con Discord' });
  }
};
