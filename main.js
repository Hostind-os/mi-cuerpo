'use strict';
/* Experiencia 3D anatómica · Three.js r128 (scripts clásicos, sin compilación).
   Textos editables: config/textos.json · Discord: js/discord.js + api/send-to-discord.js */
(async () => {
const $ = s => document.querySelector(s);

/* ---------- 1. Configuración (config/textos.json) ---------- */
const DEF = { titulo: 'Mi yo para que no te estreses', titular: 'para cuando te estreses mi niñita', subtitulo: '(Especialmente para ti, Alicia)', sujeto: { altura_m: 1.74, peso_kg: 73 },
  organos: { corazon: { titulo: 'Mi corazón', texto: 'Edita este texto en config/textos.json' }, cerebro: { titulo: 'Tu mente', texto: 'Edita este texto en config/textos.json' } },
  mensajes: {}, capasIniciales: { piel: true, musculos: false, huesos: true, vasos: true, nervios: true }, opacidadInicial: .3, modeloGLTF: '' };
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] ? merge(a[k], b[k]) : b[k]; return a; };
let cfg = DEF; try { const r = await fetch('config/textos.json', { cache: 'no-store' }); if (r.ok) cfg = merge(DEF, await r.json()); } catch (e) { console.warn('Usando configuración por defecto:', e); }
$('#eyebrow').textContent = cfg.titulo; $('#titulo').textContent = cfg.titular; $('#sujeto').textContent = cfg.subtitulo; document.title = cfg.titulo;
const sj = cfg.sujeto; // altura y peso solo escalan el modelo
if (window.initDiscord) window.initDiscord(cfg);

/* ---------- 2. Renderizador, cámara y luz de estudio ---------- */
const stage = $('#stage'), cv = $('#c');
const fail = m => stage.insertAdjacentHTML('beforeend', `<p class="fail">${m}</p>`);
if (!window.THREE || !THREE.OrbitControls) return fail('No se pudo cargar el visor 3D. Revisa la conexión y recarga la página.');
let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return fail('Tu navegador no admite WebGL.'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .05, 50); camera.position.set(1.7, 1.25, 3.7);
const controls = new THREE.OrbitControls(camera, cv);
Object.assign(controls, { enableDamping: true, dampingFactor: .07, minDistance: .6, maxDistance: 7, autoRotate: true, autoRotateSpeed: .9, maxPolarAngle: Math.PI * .56 });
let idle; controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
controls.addEventListener('end', () => { idle = setTimeout(() => controls.autoRotate = !active, 6000); });
const C = h => new THREE.Color(h).convertSRGBToLinear();
scene.add(new THREE.HemisphereLight(C(0xffe9de), C(0x2a1822), .9));
const key = new THREE.DirectionalLight(C(0xfff0e4), 1.7); key.position.set(2.5, 3.5, 3); scene.add(key);
const rimL = new THREE.DirectionalLight(C(0xffa7c0), 1.6); rimL.position.set(-3, 2, -3); scene.add(rimL);
const top = new THREE.SpotLight(C(0xffffff), 1.1, 8, .6, .6); top.position.set(0, 4, .5); top.target.position.set(0, .9, 0); scene.add(top, top.target);
const dot = (() => { const k = document.createElement('canvas'); k.width = k.height = 64; const x = k.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(k); })();
const add = m => { scene.add(m); return m; };
add(Object.assign(new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), new THREE.MeshBasicMaterial({ map: dot, color: C(0xe8c27a), transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })), { renderOrder: -1 })).rotation.x = -Math.PI / 2;
add(new THREE.Mesh(new THREE.RingGeometry(.62, .635, 96), new THREE.MeshBasicMaterial({ color: C(0xe8c27a), transparent: true, opacity: .7, side: THREE.DoubleSide }))).rotation.x = -Math.PI / 2;
[[.8, .808, .4], [.98, .986, .22]].forEach(([a, b, o]) => add(new THREE.Mesh(new THREE.RingGeometry(a, b, 96), new THREE.MeshBasicMaterial({ color: C(0xe8c27a), transparent: true, opacity: o, side: THREE.DoubleSide }))).rotation.x = -Math.PI / 2);

/* ---------- 3. Materiales (rim frío «futurista» en los internos) ---------- */
const M = (c, o = {}) => { const m = new THREE.MeshPhysicalMaterial(Object.assign({ roughness: .5 }, o, { color: C(c) })); if (o.emissive != null) m.emissive = C(o.emissive); return m; };
const rimify = (m, hex, k) => { m.onBeforeCompile = sh => { sh.uniforms.uRim = { value: C(hex).multiplyScalar(k) };
  sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', 'gl_FragColor.rgb += pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.) * uRim;\n#include <dithering_fragment>'); }; return m; };
const RIM = 0xffb8c8;
const boneM = rimify(M(0xebe3d0, { roughness: .45, clearcoat: .3 }), RIM, .25), muscleM = rimify(M(0xa83a3a, { roughness: .5, clearcoat: .45, clearcoatRoughness: .35, emissive: 0x2a0808, transparent: true, depthWrite: false }), RIM, .2),
artM = rimify(M(0xd62f44, { roughness: .35, clearcoat: .7, emissive: 0x3a0610 }), RIM, .25), veinM = rimify(M(0x2f55c8, { roughness: .35, clearcoat: .7, emissive: 0x0a1240 }), RIM, .25),
nerveM = rimify(M(0xf3d878, { roughness: .45, emissive: 0x6b5a24 }), 0xfff0c0, .25), brainM = rimify(M(0xe5a3a8, { roughness: .5, clearcoat: .7, clearcoatRoughness: .3, emissive: 0xff3d77, emissiveIntensity: .04 }), RIM, .25),
heartM = rimify(M(0xb71c2e, { roughness: .4, clearcoat: 1, clearcoatRoughness: .2, emissive: 0xff2457, emissiveIntensity: .06 }), RIM, .3);
const skinU = { value: .3 }, skinM = M(0xe9bda5, { roughness: .55, emissive: 0x3a2a30, emissiveIntensity: .25, transparent: true, depthWrite: false });
skinM.onBeforeCompile = sh => { sh.uniforms.uA = skinU; sh.fragmentShader = 'uniform float uA;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
  'float fr = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);\ngl_FragColor.a = clamp(uA + (1. - uA) * fr * .6, 0., .97);\ngl_FragColor.rgb += fr * vec3(.8, .45, .5) * .5;\n#include <dithering_fragment>'); };
const setOpa = v => { skinU.value = v; const tr = v < .99; if (muscleM.transparent !== tr) { muscleM.transparent = tr; muscleM.depthWrite = !tr; muscleM.needsUpdate = true; } muscleM.opacity = v; };

/* ---------- 4. Cuerpo y capas ---------- */
const body = new THREE.Group(); scene.add(body);
const S = sj.altura_m / 1.76, W0 = Math.sqrt(sj.peso_kg / 73); body.scale.set(S * W0, S, S * W0); // la altura y el peso del JSON escalan el modelo
const L = {}; ['piel', 'musculos', 'huesos', 'vasos', 'nervios'].forEach(n => { L[n] = new THREE.Group(); body.add(L[n]); });
const P = { skin: [], muscle: [], bone: [], art: [], vein: [], nerve: [] }, FL = { art: [], vein: [], nerve: [] }, clickables = [];
const V3 = a => new THREE.Vector3(...a), UP = new THREE.Vector3(0, 1, 0), mx = new THREE.Matrix4(), qt = new THREE.Quaternion(), eu = new THREE.Euler();
const put = (k, g, c, sc, q) => { g.applyMatrix4(mx.compose(c, q || qt.identity(), sc)); P[k].push(g); };
const ell = (k, c, r, e) => put(k, new THREE.SphereGeometry(1, 20, 14), V3(c), V3(r), e ? qt.setFromEuler(eu.set(e[0], e[1], e[2])) : null);
const mus = (c, r, e) => { ell('muscle', c, r, e); ell('skin', c, r.map(v => v * 1.13), e); };               // músculo + su relieve en la piel
const belly = (a, b, w, d) => { let A = V3(a), B = V3(b); if (A.y < B.y) [A, B] = [B, A];
  const c = A.clone().add(B).multiplyScalar(.5), h = A.distanceTo(B) / 2, q = new THREE.Quaternion().setFromUnitVectors(UP, A.clone().sub(B).normalize());
  put('muscle', new THREE.SphereGeometry(1, 20, 14), c, V3([w, h, d]), q); put('skin', new THREE.SphereGeometry(1, 20, 14), c, V3([w * 1.13, h * 1.03, d * 1.13]), q); };
const capsule = (a, b, r1, r2) => { const A = V3(a), B = V3(b), q = new THREE.Quaternion().setFromUnitVectors(UP, A.clone().sub(B).normalize()), one = V3([1, 1, 1]);
  put('skin', new THREE.CylinderGeometry(r1, r2, A.distanceTo(B), 20, 1, true), A.clone().add(B).multiplyScalar(.5), one, q); put('skin', new THREE.SphereGeometry(r1, 20, 14), A, one); put('skin', new THREE.SphereGeometry(r2, 20, 14), B, one); };
const lb = (a, b, r, e = 1.8) => { const A = V3(a), B = V3(b), h = A.distanceTo(B) / 2; // hueso largo: diáfisis fina y epífisis ensanchadas
  const pr = new THREE.SplineCurve([[0, -h], [r * e * .75, -h], [r * e, -h * .93], [r * 1.2, -h * .7], [r * .85, -h * .35], [r * .8, 0], [r * .85, h * .35], [r * 1.2, h * .7], [r * e * 1.05, h * .93], [r * e * .75, h], [0, h]].map(p => new THREE.Vector2(...p))).getPoints(24).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  put('bone', new THREE.LatheGeometry(pr, 12), A.clone().add(B).multiplyScalar(.5), V3([1, 1, 1]), new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize())); };
const tube = (k, pts, r, flow) => { const c = new THREE.CatmullRomCurve3(pts.map(V3)); P[k].push(new THREE.TubeGeometry(c, Math.max(12, pts.length * 8), r, 8));
  if (flow) for (let i = 0; i < flow[0]; i++) FL[k].push({ c, t: i / flow[0], s: flow[1] * (.85 + Math.random() * .3), r: flow[2] }); return c; };
const mirP = p => [-p[0], p[1], p[2]], sym = (k, pts, r, flow) => { tube(k, pts, r, flow); tube(k, pts.map(mirP), r, flow); };

// columna vertebral (curva en S) y función auxiliar para costillas
const sp = new THREE.CatmullRomCurve3([[0, 1.56, -.03], [0, 1.46, -.035], [0, 1.38, -.06], [0, 1.28, -.075], [0, 1.18, -.065], [0, 1.10, -.04], [0, 1.02, -.025], [0, .95, -.03], [0, .88, -.055]].map(V3));
const spZ = y => sp.getPoint(Math.min(1, Math.max(0, (1.56 - y) / .68))).z;

/* — Piel: tronco en V, cuello y cabeza — */
put('skin', new THREE.LatheGeometry(new THREE.SplineCurve([[0, .8], [.12, .82], [.15, .9], [.14, .98], [.125, 1.08], [.14, 1.2], [.17, 1.3], [.185, 1.38], [.15, 1.44], [.075, 1.48], [0, 1.49]].map(p => new THREE.Vector2(...p))).getPoints(48).map(p => new THREE.Vector2(Math.max(0, p.x), p.y)), 40), V3([0, 0, .01]), V3([1, 1, .72]));
capsule([0, 1.55, -.02], [0, 1.44, -.03], .045, .055);
ell('skin', [0, 1.665, 0], [.082, .095, .1]); ell('skin', [0, 1.6, .035], [.055, .052, .07]); ell('skin', [0, 1.628, .098], [.009, .014, .012]);

/* — Cráneo, columna, caja torácica, pelvis — */
ell('bone', [0, 1.67, 0], [.077, .088, .097]); ell('bone', [0, 1.615, .062], [.05, .036, .038]); [1, -1].forEach(s => { ell('bone', [s * .033, 1.668, .088], [.02, .019, .012]); ell('bone', [s * .082, 1.65, -.01], [.008, .02, .014]); });
tube('bone', [[-.048, 1.635, -.012], [-.046, 1.59, -.005], [-.034, 1.565, .03], [-.015, 1.552, .062], [0, 1.55, .07], [.015, 1.552, .062], [.034, 1.565, .03], [.046, 1.59, -.005], [.048, 1.635, -.012]], .0085);
for (let i = 0; i < 24; i++) { const t = i / 23 * .9, p = sp.getPoint(t), g = new THREE.CylinderGeometry(.016 + .012 * t, .018 + .013 * t, .02, 12), tr = new THREE.BoxGeometry(.04 + .06 * t, .004, .008);
  g.translate(p.x, p.y, p.z); tr.translate(p.x, p.y, p.z - .02); P.bone.push(g, tr); ell('bone', [p.x, p.y - .003, p.z - .03 - .012 * t], [.006, .014, .016], [.5, 0, 0]); }
ell('bone', [0, .895, -.05], [.034, .06, .02]);
const ribW = [.07, .09, .105, .115, .12, .122, .12, .115, .105, .095], ribD = [.05, .06, .07, .075, .08, .08, .078, .075, .07, .065];
for (let i = 0; i < 10; i++) { const y = 1.41 - i * .03, d = ribD[i], w = ribW[i], zc = spZ(y) + d, pts = [];
  for (let k = 0; k <= 10; k++) { const f = Math.PI - k / 10 * (Math.PI - .14); pts.push([w * Math.sin(f), y - .045 * k / 10, zc + d * Math.cos(f)]); }
  sym('bone', pts, .0055); sym('nerve', [[0, y, spZ(y) - .022]].concat(pts.map(p => [p[0] * .97, p[1] - .01, p[2]])), .0024); }
ell('bone', [0, 1.29, .075], [.017, .09, .009], [-.24, 0, 0]);
ell('bone', [0, .86, 0], [.1, .005, .1]); // base de la pelvis
const pel = new THREE.TorusGeometry(.095, .013, 8, 24); put('bone', pel, V3([0, .86, 0]), V3([1, 1, 1]), qt.setFromEuler(eu.set(Math.PI / 2, 0, 0)));

/* — Extremidades: huesos, músculos y relieve de la piel (lado derecho e izquierdo) — */
[1, -1].forEach(s => { const X = (x, y, z) => [s * x, y, z];
  // huesos
  lb(X(.195, 1.405, -.01), X(.235, 1.12, -.02), .0125, 2); lb(X(.235, 1.12, -.02), X(.28, .88, .02), .0075, 1.9); lb(X(.245, 1.12, -.03), X(.288, .88, .012), .0068, 1.9); lb(X(.012, 1.405, .05), X(.19, 1.415, -.005), .008, 1.4);
  ell('bone', X(.11, 1.33, -.075), [.055, .07, .008], [0, s * .4, 0]); ell('bone', X(.095, .945, -.01), [.075, .065, .026], [0, -.45 * s, -.35 * s]);
  ell('bone', X(.285, .83, .03), [.022, .04, .01]); for (let k = -2; k <= 2; k++) lb(X(.28 + .0095 * k, .82, .035), X(.285 + .0125 * k, .74 - Math.abs(k) * .006, .045), .0045, 1.4);
  lb(X(.09, .86, -.005), X(.095, .48, .01), .02, 2.1); lb(X(.095, .48, .01), X(.09, .085, -.005), .016, 2); lb(X(.125, .47, .005), X(.12, .125, -.005), .006, 1.8);
  ell('bone', X(.09, .87, -.005), [.026, .026, .026]); ell('bone', X(.095, .485, .052), [.017, .02, .008]); ell('bone', X(.09, .045, -.035), [.02, .028, .04]);
  for (let k = 0; k < 5; k++) { const x = .09 + (-.012 + k * .0105); lb(X(.09 - .006 + k * .0045, .055, .015), X(x, .022, .105), .0065, 1.5); lb(X(x, .022, .105), X(x, .017, .145 - (k == 4 ? .02 : 0)), .0045, 1.4); }
  // músculos (cada uno añade además su relieve a la piel)
  mus(X(.085, 1.31, .1), [.085, .06, .038], [0, 0, -s * .25]);                                           // pectoral
  for (let i = 0; i < 4; i++) mus(X(.028, 1.2 - i * .062, .108), [.027, .03, .016]);                      // abdominales
  mus(X(.115, 1.1, .06), [.04, .1, .04], [0, 0, s * .15]); mus(X(.13, 1.22, .04), [.025, .06, .03]);      // oblicuos y serrato
  mus(X(.115, 1.2, -.075), [.075, .14, .03], [0, 0, s * .2]); mus(X(.07, 1.44, -.055), [.1, .065, .03], [0, 0, s * .35]); // dorsal y trapecio
  mus(X(.05, 1.3, -.095), [.07, .11, .022]); mus(X(.035, 1.1, -.09), [.03, .15, .025]);                  // espalda media y lumbares
  mus(X(.078, .9, -.095), [.085, .085, .065]); mus(X(.205, 1.4, 0), [.05, .065, .055]);                   // glúteo y deltoides
  belly(X(.035, 1.52, 0), X(.015, 1.43, .04), .014, .014);                                                // esternocleidomastoideo
  belly(X(.215, 1.34, .03), X(.25, 1.15, .025), .036, .034); belly(X(.215, 1.34, -.035), X(.25, 1.14, -.03), .04, .034); // bíceps, tríceps
  belly(X(.258, 1.1, .012), X(.292, .9, .025), .034, .028); belly(X(.262, 1.1, -.022), X(.29, .9, -.005), .03, .026);      // antebrazo
  belly(X(.095, .88, .055), X(.1, .56, .045), .058, .05); belly(X(.14, .85, .02), X(.122, .54, .025), .045, .045); belly(X(.062, .7, .045), X(.085, .53, .05), .04, .04); // cuádriceps
  belly(X(.1, .86, -.045), X(.1, .55, -.035), .058, .048); belly(X(.05, .84, 0), X(.07, .62, .01), .038, .038);      // isquios y aductores
  belly(X(.1, .47, -.04), X(.095, .25, -.03), .05, .046); belly(X(.095, .38, -.02), X(.09, .16, -.015), .038, .034); belly(X(.112, .44, .03), X(.1, .14, .025), .026, .024); // pantorrilla y tibial
  // relieve de la piel en extremidades, manos y pies
  capsule(X(.205, 1.4, 0), X(.255, 1.12, -.015), .052, .04); capsule(X(.255, 1.12, -.015), X(.295, .88, .02), .04, .028); ell('skin', X(.285, .79, .04), [.032, .09, .022]);
  capsule(X(.09, .88, 0), X(.098, .5, .01), .08, .058); capsule(X(.098, .5, .01), X(.09, .085, -.005), .055, .034); ell('skin', X(.09, .04, .045), [.036, .044, .105]);
});

/* — Sistema vascular (arterias rojas, venas azules) con flujo animado — */
tube('art', [[.015, 1.3, .035], [.012, 1.37, .03], [0, 1.42, 0], [.03, 1.415, -.03], [.045, 1.34, -.055], [.035, 1.2, -.06], [.02, 1.05, -.045], [0, .95, -.025]], .0115, [6, .18]);
tube('vein', [[-.02, 1.31, .03], [-.02, 1.38, .015], [-.015, 1.46, .01], [-.01, 1.54, .015]], .009, [3, .14, true]); tube('vein', [[-.02, 1.22, .03], [-.025, 1.15, 0], [-.025, 1.05, -.03], [-.015, .95, -.035]], .01, [3, .14, true]);
sym('art', [[0, .95, -.025], [.05, .9, 0], [.085, .8, .02], [.09, .6, .03], [.095, .48, .028], [.095, .3, .012], [.09, .1, .022], [.095, .045, .075]], .0075, [4, .14]);
sym('vein', [[0, .95, -.035], [.055, .88, -.02], [.1, .8, -.015], [.105, .6, -.012], [.105, .48, -.02], [.1, .3, -.02], [.095, .1, -.005], [.1, .045, .07]], .0075, [4, .12, true]);
sym('art', [[.01, 1.41, .012], [.1, 1.425, 0], [.19, 1.385, 0], [.225, 1.25, 0], [.24, 1.12, .005], [.265, 1, .025], [.285, .88, .04], [.292, .78, .045]], .005, [3, .16]);
sym('vein', [[.01, 1.45, .01], [.12, 1.44, .02], [.205, 1.37, .02], [.245, 1.22, .02], [.255, 1.1, .03], [.28, .92, .05], [.295, .78, .05]], .005, [3, .12, true]);
sym('art', [[.005, 1.42, .012], [.02, 1.5, .022], [.024, 1.58, .028], [.02, 1.63, .025]], .005, [2, .14]); sym('vein', [[.012, 1.4, .015], [.032, 1.48, .012], [.034, 1.56, 0], [.03, 1.63, -.01]], .006, [2, .12, true]);

/* — Sistema nervioso: médula, plexos, ciático, vago — */
tube('nerve', sp.getPoints(24).map(p => [p.x, p.y, p.z - .022]), .0075, [6, .25]);
sym('nerve', [[0, 1.45, -.057], [.05, 1.43, -.05], [.12, 1.42, -.03], [.19, 1.38, -.015], [.225, 1.25, -.02], [.24, 1.12, -.01], [.265, 1.0, .015], [.285, .88, .03], [.295, .8, .04]], .0032, [3, .3]);
sym('nerve', [[0, .99, -.045], [.05, .93, -.05], [.09, .85, -.04], [.1, .7, -.03], [.1, .5, -.02], [.098, .4, -.02], [.09, .2, -.005], [.09, .09, .01], [.095, .04, .1]], .0042, [4, .3]);
sym('nerve', [[.015, 1.62, -.03], [.03, 1.52, .005], [.035, 1.42, .02], [.03, 1.3, .04], [.01, 1.18, .05], [0, 1.05, .04]], .0025, [2, .25]);
tube('nerve', [[0, 1.64, -.03], [0, 1.6, -.035], [0, 1.56, -.04]], .011);

/* — Cerebro (clicable): hemisferios con circunvoluciones, lóbulos temporales y cerebelo — */
const brain = new THREE.Group(); brain.position.set(0, 1.67, 0); L.nervios.add(brain);
const organ = (kind, geo, mat, parent, p, sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...sc); m.userData = { kind }; parent.add(m); clickables.push(m); return m; };
[-1, 1].forEach(s => { const g = new THREE.SphereGeometry(1, 72, 54), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i); if (v.x * s < 0) v.x *= .2; if (v.y < -.2) v.y = -.2 + (v.y + .2) * .6;
    const w = Math.sin(9 * v.y + 7 * v.z + 3 * v.x), f = Math.sin(24 * v.x + 3 * w + 18 * v.z) * Math.sin(21 * v.y + 2 * w + 10 * v.z);
    v.multiplyScalar(1 - .07 * Math.pow(1 - Math.abs(f), 4)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); organ('brain', g, brainM, brain, [s * .016, 0, 0], [.058, .054, .079]); organ('brain', new THREE.SphereGeometry(1, 28, 20), brainM, brain, [s * .046, -.03, .012], [.024, .02, .04]); });
const cg = new THREE.SphereGeometry(1, 40, 28), cq = cg.attributes.position, cvv = new THREE.Vector3();
for (let i = 0; i < cq.count; i++) { cvv.fromBufferAttribute(cq, i); cvv.multiplyScalar(1 + .045 * Math.sin(cvv.y * 60)); cq.setXYZ(i, cvv.x, cvv.y, cvv.z); }
cg.computeVertexNormals(); organ('brain', cg, brainM, brain, [0, -.045, -.06], [.045, .026, .036]);

/* — Corazón (clicable): ventrículos, aurículas, pulmonar y coronarias — */
const heart = new THREE.Group(); heart.position.set(.02, 1.265, .04); heart.rotation.set(.1, -.25, .45); L.vasos.add(heart);
const blob = (sc, p, taper) => { const g = new THREE.SphereGeometry(1, 40, 30), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i); if (taper && v.y < 0) { const k = 1 - taper * -v.y; v.x *= k; v.z *= k; } v.multiplyScalar(1 + .02 * Math.sin(v.x * 9 + v.y * 7) * Math.sin(v.z * 8)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); organ('heart', g, heartM, heart, p, sc); };
blob([.038, .056, .036], [.012, -.012, 0], .55); blob([.032, .046, .03], [-.024, -.004, .014], .4); blob([.024, .026, .024], [-.032, .042, -.004], 0); blob([.021, .02, .02], [.02, .046, -.022], 0); blob([.012, .014, .01], [-.045, .052, .012], 0);
const hv = (pts, r, m) => heart.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V3)), 24, r, 8), m));
hv([[-.012, .04, .026], [-.004, .07, .02], [.02, .085, -.004], [.045, .08, -.03]], .011, veinM); hv([[.005, .052, .03], [.012, .02, .036], [.016, -.015, .033], [.014, -.05, .018]], .0028, artM);
hv([[-.008, .05, .03], [-.036, .03, .034], [-.052, 0, .03], [-.04, -.03, .026]], .0028, artM); hv([[.01, .05, .025], [.035, .04, .012], [.05, .01, 0], [.044, -.02, -.012]], .0026, artM);

/* ---------- 5. Fusión de geometrías por capa (pocas llamadas de dibujo) ---------- */
const BGU = THREE.BufferGeometryUtils;
const build = (list, mat, group, order) => { if (!list.length) return; let g = null; try { g = BGU && BGU.mergeBufferGeometries(list); } catch (e) { g = null; }
  (g ? [g] : list).forEach(x => { const m = new THREE.Mesh(x, mat); if (order) m.renderOrder = order; group.add(m); }); };
build(P.skin, skinM, L.piel, 5); build(P.muscle, muscleM, L.musculos, 3); build(P.bone, boneM, L.huesos); build(P.art, artM, L.vasos); build(P.vein, veinM, L.vasos); build(P.nerve, nerveM, L.nervios);
const flows = {}; [['art', L.vasos, 0xff8f9c], ['vein', L.vasos, 0xa9b8ff], ['nerve', L.nervios, 0xfffbe0]].forEach(([k, grp, col]) => { const n = FL[k].length; if (!n) return;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color: C(col), size: .03, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; grp.add(p); flows[k] = p; });

/* Modelo GLTF opcional (config.modeloGLTF): sustituye al procedural solo si carga bien */
if (cfg.modeloGLTF && THREE.GLTFLoader) new THREE.GLTFLoader().load(cfg.modeloGLTF, gl => { const o = gl.scene, b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.76 / sz.y;
  o.scale.setScalar(k); o.position.set(-c.x * k, -b.min.y * k, -c.z * k); body.add(o); for (const n in L) L[n].visible = false; L.piel.visible = L.huesos.visible = false;
  o.traverse(m => { if (!m.isMesh) return; const kind = /brain|cerebro/i.test(m.name) ? 'brain' : /heart|coraz/i.test(m.name) ? 'heart' : null; if (kind) { m.userData = { kind }; clickables.push(m); } });
}, undefined, e => console.warn('No se pudo cargar el modelo GLTF; se mantiene el procedural.', e));

/* ---------- 6. Interactividad: capas, opacidad, raycasting y tarjeta flotante ---------- */
const fx = { brain: { v: 0, base: .04, mat: brainM }, heart: { v: 0, base: .06, mat: heartM } };
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), pv = new THREE.Vector3(), card = $('#card');
let hover = null, active = null, dn = null, tip = null, W = 1, H = 1;
const vis = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const pick = e => { const r = cv.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera);
  const h = ray.intersectObjects(clickables.filter(vis), false)[0]; return h ? h.object.userData.kind : null; };
const place = () => { if (!tip) return; tip.getWorldPosition(pv).project(camera); const x = (pv.x + 1) / 2 * W, y = (1 - pv.y) / 2 * H, w = card.offsetWidth, h = card.offsetHeight;
  let tx = x + 36, ty = y - h / 2; if (tx + w > W - 8) tx = x - 36 - w; if (tx < 8) { tx = Math.min(Math.max(x - w / 2, 8), W - w - 8); ty = y + 40; }
  card.style.transform = `translate(${tx}px,${Math.min(Math.max(ty, 8), H - h - 8)}px)`; };
const closeCard = () => { active = null; tip = null; card.classList.remove('on'); };
const openCard = k => { const o = cfg.organos[k == 'heart' ? 'corazon' : 'cerebro']; card.querySelector('h2').textContent = o.titulo; card.querySelector('p').textContent = o.texto;
  active = k; tip = k == 'heart' ? heart : brain; controls.autoRotate = false; card.classList.remove('on'); void card.offsetWidth; card.classList.add('on'); place(); };
cv.addEventListener('pointermove', e => { if (e.buttons) return; hover = pick(e); cv.style.cursor = hover ? 'pointer' : ''; });
cv.addEventListener('pointerleave', () => hover = null);
cv.addEventListener('pointerdown', e => dn = [e.clientX, e.clientY]);
cv.addEventListener('pointerup', e => { if (!dn) return; const d = Math.hypot(e.clientX - dn[0], e.clientY - dn[1]); dn = null; if (d > 6) return; const k = pick(e); k ? openCard(k) : closeCard(); });
$('#cx').onclick = closeCard; addEventListener('keydown', e => { if (e.key == 'Escape') closeCard(); });
document.querySelectorAll('#panel button').forEach(b => { const n = b.dataset.l, on = !!cfg.capasIniciales[n]; L[n].visible = on; b.setAttribute('aria-pressed', on);
  b.onclick = () => { L[n].visible = !L[n].visible; b.setAttribute('aria-pressed', L[n].visible); if (active && !vis(tip)) closeCard(); }; });
const opa = $('#opa'); opa.value = cfg.opacidadInicial; setOpa(+opa.value); opa.oninput = () => setOpa(+opa.value);
const fit = () => { W = stage.clientWidth || 1; H = stage.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
new ResizeObserver(fit).observe(stage); fit(); controls.target.set(0, .88 * S, 0);

/* ---------- 7. Bucle de animación (latido, brillo, flujo sanguíneo y nervioso) ---------- */
let ph = 0; const clock = new THREE.Clock();
(function loop() { requestAnimationFrame(loop);
  try {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime; controls.update();
    ph += dt * (1 + .5 * fx.heart.v); const p = ph % 1, b = Math.exp(-(((p - .08) * 16) ** 2)) + .6 * Math.exp(-(((p - .3) * 16) ** 2)); heart.scale.setScalar(1 + .08 * b);
    for (const k in fx) { const f = fx[k]; f.v += (((hover == k || active == k) ? 1 : 0) - f.v) * Math.min(1, dt * 7); f.mat.emissiveIntensity = f.base + .05 * (.5 + .5 * Math.sin(t * 1.8)) + f.v * .9; }
    for (const k in flows) { const a = flows[k].geometry.attributes.position; FL[k].forEach((f, i) => { f.t = (f.t + dt * f.s) % 1; const v = f.c.getPointAt(f.r ? 1 - f.t : f.t); a.setXYZ(i, v.x, v.y, v.z); }); a.needsUpdate = true; }
    place();
  } catch (err) { if (!loop.warned) { loop.warned = 1; console.warn('Error en el bucle de animación:', err); } }
  renderer.render(scene, camera); })();
})();
