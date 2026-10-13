# Mi yo 3D — guía de despliegue (GitHub + Vercel)

## Arquitectura elegida, y por qué

```
proyecto/
├── index.html                ← estático, sin cambios de fondo
├── style.css                  ← sin cambios
├── script.js                   ← tu motor 3D (procedural, sin .glb externo),
│                                  ahora lee los textos de data/config.json
├── data/config.json            ← textos editables del corazón/cerebro
├── api/send-to-discord.js      ← función serverless → tu webhook de Discord
├── package.json, .env.example, .gitignore
```

Pediste "estructura limpia de archivos estáticos, o un proyecto ligero con
Vite/Next.js". Me quedo con la primera opción a propósito: tu `script.js`
usa Three.js tal cual lo cargan los `<script>` del HTML (variable global
`THREE`), no `import`s de npm — no hay nada que un bundler necesite
empaquetar. Añadir Vite o Next.js aquí sumaría un paso de build, un
`node_modules`, y obligaría a reescribir ese motor 3D para que funcione con
módulos ES, sin ninguna ganancia real. Vercel despliega una carpeta con
HTML/CSS/JS sueltos + una carpeta `api/` de forma nativa, sin configuración
adicional: es el camino más corto a producción y el más fácil de mantener
para un proyecto de este tamaño.

## Una corrección importante sobre las variables de entorno

Mencionaste `VITE_DISCORD_WEBHOOK_URL`. Ese prefijo (`VITE_`, o
`NEXT_PUBLIC_`) hace justo lo contrario de lo que quieres: le dice al
bundler que **incluya ese valor dentro del JavaScript que se descarga el
navegador**, visible para cualquiera que abra las herramientas de
desarrollador. Es exactamente el agujero que estábamos evitando al mover
el envío a un backend.

Aquí no hay bundler, así que la variable se llama simplemente
`DISCORD_WEBHOOK_URL`, y solo existe dentro de `api/send-to-discord.js`
—una función que corre en el servidor de Vercel, nunca en el navegador—.
El archivo `.env.example` trae el detalle.

## Pasos para desplegar

### 1. Crear el webhook en Discord
Server Settings → Integraciones → Webhooks → Nuevo webhook → elige el canal
privado → copia la URL.

### 2. Subir el proyecto a GitHub
```bash
git init
git add .
git commit -m "Primer despliegue"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```
El `.gitignore` ya excluye `.env`, así que el webhook no viaja al repo.

### 3. Importar el repo en Vercel
En [vercel.com](https://vercel.com) → **Add New → Project** → importa el
repo. Vercel detecta que no hay framework (preset "Other") y despliega
`index.html` y compañía como sitio estático, y todo lo que hay en `api/`
como funciones serverless — sin tocar nada más.

### 4. Configurar las variables de entorno
Project → Settings → Environment Variables:

| Nombre | Valor | Obligatoria |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | la URL que copiaste en el paso 1 | Sí |
| `DISCORD_MENTION_USER_ID` | tu ID numérico de Discord | No (sin ella, llega el mensaje igual, sin mención) |

### 5. Deploy
Vercel redepliega solo con cada `git push` a `main`. El primer deploy puede
lanzarse también desde el botón "Deploy" tras importar el repo.

### Probar en local antes de subir
```bash
npm i -g vercel   # una vez
vercel dev         # lee tu .env local y sirve todo en localhost, api incluida
```
`index.html` abierto directamente con doble clic (`file://`) **no**
funcionará del todo: los navegadores bloquean el `fetch` a
`data/config.json` desde `file://`, y tampoco habrá `/api/` que responda.
Usa `vercel dev`, o cualquier servidor local, para probar.

## Editar los mensajes del corazón / cerebro
Abre `data/config.json`, cambia `titulo`/`texto` de `corazon` o `cerebro`
(usa `\n` para un salto de línea), guarda y haz `git push`. No hace falta
tocar `script.js` ni la lógica 3D para nada.

## Lo que ya traía tu script.js (y por qué no se tocó)
Ya incluía: raycasting sobre corazón/cerebro (`clickables`, `pick()`), la
tarjeta modal (`openModal`/`closeModal`), el conmutado de las 4 capas con
efecto de rayos X (`on`, `sync()`), y la animación de corazones al enviar
un mensaje. El único cambio dentro de `script.js` es que los textos del
modal ahora vienen de `data/config.json` en vez de estar fijos en el
código.

## Sobre `api/send-to-discord.js`
Se mantiene en CommonJS (`module.exports`, no `export default`) a
propósito: así funciona en Vercel sin añadir `"type": "module"` a
`package.json`. Sobre tu versión añadí: límite y saneado del mensaje,
un pequeño cooldown por IP para evitar dobles envíos, el ID de mención
movido a variable de entorno (antes estaba escrito en el código), y
`allowed_mentions` restringido para que un mensaje que por accidente
contenga "@everyone" no dispare esa mención.
