// api/send-visit.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: 'Falta DISCORD_WEBHOOK_URL' });

  const tuUserId = '1060945472577089658';

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Notificador de Visitas 👁️',
        content: `<@${tuUserId}> **¡Alguien acaba de entrar a la web!** 💖`,
        allowed_mentions: { users: [tuUserId] }
      })
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'Error enviando notificación' });
  }
};
