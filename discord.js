/* Conexión del formulario con Discord.
   El navegador NUNCA ve la URL del webhook: llama a /api/send-to-discord (api/send-to-discord.js),
   que la lee de la variable de entorno DISCORD_WEBHOOK_URL en Vercel. */
(function () {
  window.initDiscord = function (cfg) {
    const t = Object.assign({ placeholder: 'Escríbeme algo bonito…', boton: 'Enviar', enviando: 'Enviando…', exito: 'Mensaje enviado con éxito ✓', error: 'No se ha podido enviar. Inténtalo de nuevo.' }, cfg && cfg.mensajes);
    const form = document.getElementById('msgbar'), input = document.getElementById('msg'), btn = document.getElementById('send'), st = document.getElementById('status');
    if (!form) return;
    input.placeholder = t.placeholder; btn.textContent = t.boton;
    let timer;
    const say = (txt, err) => { clearTimeout(timer); st.textContent = txt; st.className = 'show' + (err ? ' err' : ''); if (txt !== t.enviando) timer = setTimeout(() => st.className = '', 5000); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const message = input.value.trim(); if (!message) return;
      btn.disabled = true; say(t.enviando);
      try {
        const r = await fetch('/api/send-to-discord', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        input.value = ''; say(t.exito);
      } catch (err) { say(t.error, true); }
      finally { btn.disabled = false; }
    });
  };
})();
