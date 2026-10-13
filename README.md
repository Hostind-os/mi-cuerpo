# Visor anatómico 3D — Three.js + Vite + Vercel

Modelo procedural estilizado con altura aproximada de 1,74 m, cuerpo atlético y capas alternables. Incluye órbita/zoom, raycasting para corazón y cerebro, modales configurables y pulsos luminosos.

## Ejecutar en local

1. Requiere Node.js moderno (recomendado Node 20.19+ para Vite 7).
2. En esta carpeta, ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y configura `DISCORD_WEBHOOK_URL` con tu webhook privado de Discord.
4. Ejecuta `npm run dev` para el visor 3D. Nota: Vite por sí solo no ejecuta funciones de Vercel; para probar `/api/discord` localmente, usa `npx vercel dev` tras vincular/importar el proyecto con Vercel y configura la variable en ese entorno.
5. Ejecuta `npm run build` para comprobar el bundle de producción.

## Despliegue en Vercel

- Sube el proyecto a GitHub y conéctalo en Vercel.
- En **Project → Settings → Environment Variables**, crea `DISCORD_WEBHOOK_URL` con la URL del webhook; selecciónala para Production/Preview según corresponda.
- Despliega de nuevo después de cambiar variables de entorno.
- El endpoint está en `api/discord.js`. El secreto solo se lee en el servidor. **No** uses `VITE_DISCORD_WEBHOOK_URL`, ya que Vite expone las variables `VITE_*` al cliente.

## Adaptarlo a un proyecto existente

- Sustituye `script.js` y `style.css` por estos archivos y conserva `anatomy-content.js` junto a `script.js`.
- Importa el CSS y el script desde tu entrypoint: `import './style.css'; import './script.js';`.
- Asegúrate de que haya un contenedor `#anatomy-viewer` o `#app`; si no existe, el visor monta un contenedor propio en `body`.
- Copia `api/discord.js` al directorio `/api` de la raíz de Vercel.

## Personalizar contenido

Edita `anatomy-content.js`: puedes cambiar `title`, `subtitle`, `paragraphs` y `fact` de `brain` y `heart`. Los datos se insertan como texto seguro, no como HTML.

## Límites y seguridad

Este modelo está construido por geometría procedural, no es un atlas clínico validado ni una malla médica escaneada. Los vasos, nervios y costillas se simplifican visualmente. El endpoint comprueba método, origen, tamaño de mensaje y dominio del webhook, pero para una web pública de alto tráfico conviene añadir rate limiting (por ejemplo, middleware/servicio de límites) y/o autenticación para prevenir abuso.
