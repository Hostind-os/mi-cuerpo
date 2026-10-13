// api/send-visit.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return res.status(500).json({ error: 'Falta DISCORD_WEBHOOK_URL' });

  const tuUserId = '1060945472577089658';

  // Obtener la IP real (Vercel la pasa en x-forwarded-for)
  const xForwardedFor = req.headers['x-forwarded-for'];
  const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : (req.socket.remoteAddress || 'Desconocida');

  // Obtener la información del dispositivo a través del User-Agent
  const userAgent = req.headers['user-agent'] || 'Desconocido';
  
  // Detectar de forma sencilla si es móvil o PC
  let tipoDispositivo = 'Ordenador / Escritorio';
  if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) {
    tipoDispositivo = 'Móvil / Tablet';
  }

  // Crear el mensaje detallado para Discord
  const mensajeDiscord = `<@${tuUserId}> **¡Alguien acaba de entrar a la web!** 💖\n` +
                         `🌐 **IP:** \`${ip}\`\n` +
                         `📱 **Dispositivo:** ${tipoDispositivo}\n` +
                         `🔍 **Navegador / Sistema:** \`${userAgent.slice(0, 120)}...\``;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Notificador de Visitas 👁️',
        content: mensajeDiscord,
        allowed_mentions: { users: [tuUserId] }
      })
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'Error enviando notificación' });
  }
};
