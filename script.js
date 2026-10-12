// ============================================================
//  ✏️  TEXTOS PERSONALIZADOS: cambia aquí lo que se lee en las tarjetas
// ============================================================
// Se muestra al hacer clic en el CORAZÓN. Usa \n para saltos de línea.
const MENSAJE_CORAZON = "Este corazón late por ti.\nSi hoy todo va muy rápido, ven y abrázame hasta que baje el ritmo.";
// Se muestra al hacer clic en el CEREBRO.
const MENSAJE_CEREBRO = "Respira hondo. Tu cabeza no tiene que resolverlo todo hoy.\nYo me encargo de que te rías un rato.";
// Títulos de las tarjetas (opcional)
const TITULO_CORAZON = "Mi corazón";
const TITULO_CEREBRO = "Tu mente";

// ============================================================
//  🧍 MODELOS 3D REALES (OPCIONAL)
// ============================================================
// Pega la URL de un .glb/.gltf anatómico libre (servido con CORS, o un archivo de tu proyecto, p. ej. "modelos/esqueleto.glb").
// Si queda vacío se usa el modelo procedural incluido. Para que el clic funcione en tu modelo,
// sus mallas del cerebro y el corazón deben llamarse como indican estas expresiones.
const MODELOS = { esqueleto: "", nervioso: "", vascular: "" };
const NOMBRE_CEREBRO = /brain|cerebro/i, NOMBRE_CORAZON = /heart|coraz/i;

// ============================================================
(() => {
const stage = document.getElementById('stage'), cv = document.getElementById('c');
const fail = () => stage.insertAdjacentHTML('beforeend', '<p style="margin:auto;padding:2rem;text-align:center;position:relative">No se pudo cargar el visor 3D. Revisa la conexión y recarga la página.</p>');
if (!window.THREE || !THREE.OrbitControls) return fail();
let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return fail(); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .05, 50);
camera.position.set(1.1, 1.2, 3.3);
const controls = new THREE.OrbitControls(camera, cv);
controls.target.set(0, .86, 0); controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = .5; controls.maxDistance = 7; controls.autoRotate = true; controls.autoRotateSpeed = 1.1;
let idle; controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
controls.addEventListener('end', () => { idle = setTimeout(() => controls.autoRotate = !modalOpen, 6000); });

/* ---------- iluminación ---------- */
const C = h => new THREE.Color(h).convertSRGBToLinear();
scene.add(new THREE.HemisphereLight(C(0xffe0ea), C(0x3a202a), .75));
const key = new THREE.DirectionalLight(C(0xfff0e6), 1.5); key.position.set(2, 3, 3); scene.add(key);
const rim = new THREE.DirectionalLight(C(0xff7fa8), 1.1); rim.position.set(-3, 2, -3); scene.add(rim);
const fill = new THREE.PointLight(C(0xffb8cb), .6, 6); fill.position.set(-1.5, 1, 2); scene.add(fill);

/* ---------- materiales ---------- */
const V = a => new THREE.Vector3(...a), mir = p => [-p[0], p[1], p[2]], UP = new THREE.Vector3(0, 1, 0);
const M = (c, o = {}) => { const m = new THREE.MeshPhysicalMaterial(Object.assign({ roughness: .55 }, o, { color: C(c) })); if (o.emissive) m.emissive = C(o.emissive); return m; };
const boneM = M(0xe8dcc4, { roughness: .55, clearcoat: .2, clearcoatRoughness: .5 }), toothM = M(0xf7f2e8, { roughness: .3, clearcoat: .5 }), darkM = M(0x2a1820, { roughness: 1 }),
brainM = M(0xe0a1a5, { roughness: .5, clearcoat: .5, clearcoatRoughness: .35, emissive: 0xff3d77, emissiveIntensity: .04 }),
heartM = M(0xa4141f, { roughness: .4, clearcoat: .8, clearcoatRoughness: .25, emissive: 0xff2457, emissiveIntensity: .06 }),
artM = M(0xb3162a, { roughness: .35, clearcoat: .6, emissive: 0x4a0710 }), veinM = M(0x243b9c, { roughness: .35, clearcoat: .6, emissive: 0x0a1240 }),
nerveM = M(0xf1dca0, { roughness: .5, emissive: 0x6b5a24 }), cordM = M(0xf8ecc4, { roughness: .4, emissive: 0x7a6a30 });
const ROOT = { bone: new THREE.Group(), nerv: new THREE.Group(), vasc: new THREE.Group() }, G = { bone: new THREE.Group(), nerv: new THREE.Group(), vasc: new THREE.Group() };
for (const s in G) { ROOT[s].add(G[s]); scene.add(ROOT[s]); }

/* ---------- utilidades ---------- */
const clickables = [], pulses = [], CA = [], CV = [], CN = [];
const mesh = (geo, mat, g, p, s) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); g.add(m); return m; };
const tube = (pts, r, mat, g) => { const c = new THREE.CatmullRomCurve3(pts.map(V)); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(12, pts.length * 10), r, 8), mat)); return c; };
const pg = new THREE.SphereGeometry(.0065, 8, 6), pm = { n: new THREE.MeshBasicMaterial({ color: C(0xfffbe0) }), a: new THREE.MeshBasicMaterial({ color: C(0xff9aa9) }), v: new THREE.MeshBasicMaterial({ color: C(0xa9b8ff) }) };
const pulse = (c, k, g, n, s, r) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(pg, pm[k]); g.add(m); pulses.push({ c, m, t: i / n, s: s * (.85 + Math.random() * .3), r }); } };
const sym = (pts, r, mat, g, k, n, s, rev) => [pts, pts.map(mir)].forEach(P => { const c = tube(P, r, mat, g); if (k) { pulse(c, k, g, n, s, rev); (k == 'a' ? CA : k == 'v' ? CV : CN).push(c); } });
// hueso largo: perfil torneado con diáfisis fina y epífisis ensanchadas
const LB = (a, b, r, e = 1.8) => { const A = V(a), B = V(b), h = A.distanceTo(B) / 2;
  const pr = new THREE.SplineCurve([[0, -h], [r * e * .75, -h], [r * e, -h * .93], [r * 1.2, -h * .7], [r * .85, -h * .35], [r * .8, 0], [r * .85, h * .35], [r * 1.2, h * .7], [r * e * 1.05, h * .93], [r * e * .75, h], [0, h]].map(p => new THREE.Vector2(...p))).getPoints(28).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pr, 16), boneM); m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); G.bone.add(m); };

/* =================== ESQUELETO =================== */
// cráneo, cara, órbitas, pómulos, nariz, mandíbula y dientes
const sk = new THREE.SphereGeometry(1, 48, 36), sq = sk.attributes.position, tv = new THREE.Vector3();
for (let i = 0; i < sq.count; i++) { tv.fromBufferAttribute(sq, i); if (tv.y < -.45) { tv.y = -.45 + (tv.y + .45) * .35; tv.x *= .85; } if (tv.z > .5) tv.x *= 1 - .12 * (tv.z - .5); sq.setXYZ(i, tv.x, tv.y, tv.z); }
sk.computeVertexNormals(); mesh(sk, boneM, G.bone, [0, 1.67, 0], [.077, .088, .097]);
mesh(new THREE.SphereGeometry(1, 20, 14), boneM, G.bone, [0, 1.615, .062], [.05, .036, .038]);
[-1, 1].forEach(s => {
  mesh(new THREE.SphereGeometry(1, 14, 10), darkM, G.bone, [s * .033, 1.668, .09], [.02, .019, .012]);
  const rim = mesh(new THREE.TorusGeometry(.019, .0045, 8, 20), boneM, G.bone, [s * .033, 1.668, .094]); rim.scale.y = .9;
  tube([[s * .05, 1.645, .07], [s * .082, 1.64, .02], [s * .072, 1.634, -.02]], .0042, boneM, G.bone);
  mesh(new THREE.SphereGeometry(1, 10, 8), boneM, G.bone, [s * .044, 1.632, .082], [.011, .009, .008]);
});
mesh(new THREE.SphereGeometry(1, 10, 8), darkM, G.bone, [0, 1.634, .097], [.011, .015, .008]);
tube([[-.048, 1.635, -.012], [-.046, 1.59, -.005], [-.034, 1.565, .03], [-.015, 1.552, .062], [0, 1.55, .07], [.015, 1.552, .062], [.034, 1.565, .03], [.046, 1.59, -.005], [.048, 1.635, -.012]], .0085, boneM, G.bone);
[1.594, 1.572].forEach(y => { for (let i = -5; i <= 5; i++) { const a = i * .2, m = mesh(new THREE.BoxGeometry(.0065, .011, .005), toothM, G.bone, [.027 * Math.sin(a), y, .04 + .03 * Math.cos(a)]); m.rotation.y = a; } });
// columna: cuerpos vertebrales + apófisis espinosas y transversas
const sp = new THREE.CatmullRomCurve3([[0, 1.56, -.03], [0, 1.46, -.035], [0, 1.38, -.06], [0, 1.28, -.075], [0, 1.18, -.065], [0, 1.10, -.04], [0, 1.02, -.025], [0, .95, -.03], [0, .88, -.055]].map(V));
const spZ = y => sp.getPoint(Math.min(1, Math.max(0, (1.56 - y) / .68))).z;
for (let i = 0; i < 24; i++) { const t = i / 23 * .9, p = sp.getPoint(t);
  mesh(new THREE.CylinderGeometry(.016 + .012 * t, .018 + .013 * t, .02, 14), boneM, G.bone, [p.x, p.y, p.z]);
  const sp2 = mesh(new THREE.BoxGeometry(.005, .014, .026), boneM, G.bone, [p.x, p.y - .003, p.z - .03 - .012 * t]); sp2.rotation.x = .5;
  mesh(new THREE.BoxGeometry(.04 + .06 * t, .004, .008), boneM, G.bone, [p.x, p.y, p.z - .02]); }
mesh(new THREE.SphereGeometry(1, 16, 12), boneM, G.bone, [0, .895, -.05], [.034, .06, .02]);
// caja torácica: costillas, esternón y escápulas
const ribW = [.07, .09, .105, .115, .12, .122, .12, .115, .105, .095], ribD = [.05, .06, .07, .075, .08, .08, .078, .075, .07, .065];
for (let i = 0; i < 10; i++) { const y = 1.41 - i * .03, d = ribD[i], w = ribW[i], zc = spZ(y) + d, pts = [];
  for (let k = 0; k <= 10; k++) { const f = Math.PI - k / 10 * (Math.PI - .14); pts.push([w * Math.sin(f), y - .045 * k / 10, zc + d * Math.cos(f)]); }
  sym(pts, .0055, boneM, G.bone);
  sym([[0, y, spZ(y) - .022]].concat(pts.map(p => [p[0] * .97, p[1] - .01, p[2]])), .0025, nerveM, G.nerv); }
mesh(new THREE.SphereGeometry(1, 14, 10), boneM, G.bone, [0, 1.40, .052], [.028, .028, .008]);
const stn = mesh(new THREE.BoxGeometry(.024, .15, .01), boneM, G.bone, [0, 1.285, .073]); stn.rotation.x = -.24;
mesh(new THREE.ConeGeometry(.007, .03, 8), boneM, G.bone, [0, 1.18, .094]).rotation.x = Math.PI;
const scS = new THREE.Shape(); scS.moveTo(-.05, .06); scS.lineTo(.06, .07); scS.lineTo(.078, .04); scS.lineTo(.02, -.02); scS.lineTo(0, -.1); scS.lineTo(-.05, -.03); scS.closePath();
const scG = new THREE.ExtrudeGeometry(scS, { depth: .004, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 2 });
[1, -1].forEach(s => { const m = mesh(scG, boneM, G.bone, [s * .09, 1.34, -.058]); m.rotation.y = -.4 * s; m.scale.x = s; });
[[.012, 1.405, .05], [.19, 1.415, -.005]].forEach((p, i, a) => { if (i) { LB(a[0], a[1], .008, 1.4); LB(mir(a[0]), mir(a[1]), .008, 1.4); } });
// brazos y manos con falanges
const hand = (W, s) => { const L = [.032, .04, .043, .04, .032];
  for (let k = -2; k <= 2; k++) { const j = k + 2; let a = [W[0] + s * k * .004, W[1] - .01, W[2] + .004], b = [W[0] + s * (k * .0095 + .004), .805, W[2] + .02]; LB(a, b, .0042, 1.5);
    let d = [s * k * .0016, -1, .1]; const n = Math.hypot(...d); d = d.map(v => v / n);
    for (let f = 0; f < 3; f++) { const l = L[j] * [.45, .32, .23][f], c = [b[0] + d[0] * l, b[1] + d[1] * l, b[2] + d[2] * l]; LB(b, c, .0036 - f * .0004, 1.4); b = c; } } };
const arm = [[.195, 1.405, -.01], [.235, 1.12, -.02], [.28, .88, .02]];
[arm, arm.map(mir)].forEach(P => { const s = Math.sign(P[1][0]);
  LB(P[0], P[1], .0125, 2); LB(P[1], P[2], .0075, 1.9);
  LB([P[1][0] + s * .01, P[1][1], P[1][2] - .01], [P[2][0] + s * .008, P[2][1], P[2][2] - .008], .0068, 1.9); hand(P[2], s); });
// pelvis y piernas con pies
[.095, -.095].forEach(x => { const s = Math.sign(x), m = mesh(new THREE.SphereGeometry(1, 20, 14), boneM, G.bone, [x, .945, -.01], [.075, .065, .026]); m.rotation.set(0, -.45 * s, -.35 * s);
  const cr = mesh(new THREE.TorusGeometry(.07, .008, 8, 20, Math.PI * .8), boneM, G.bone, [x, .975, -.01]); cr.rotation.set(Math.PI / 2 - .5, 0, s * .3); });
const pr = mesh(new THREE.TorusGeometry(.095, .013, 8, 24), boneM, G.bone, [0, .86, 0], [1, 1.25, 1]); pr.rotation.x = Math.PI / 2;
const leg = [[.09, .86, -.005], [.095, .48, .01], [.09, .085, -.005]];
[leg, leg.map(mir)].forEach(P => { const s = Math.sign(P[1][0]);
  mesh(new THREE.SphereGeometry(.026, 14, 10), boneM, G.bone, P[0]);
  LB(P[0], P[1], .02, 2.1); LB(P[1], P[2], .016, 2);
  LB([P[1][0] + s * .03, P[1][1] - .01, P[1][2] - .005], [P[2][0] + s * .03, P[2][1] + .04, P[2][2] - .005], .006, 1.8);
  mesh(new THREE.SphereGeometry(1, 12, 10), boneM, G.bone, [P[1][0], P[1][1] + .005, P[1][2] + .042], [.017, .02, .008]);
  mesh(new THREE.SphereGeometry(1, 12, 10), boneM, G.bone, [P[2][0], .045, P[2][2] - .03], [.02, .028, .04]);
  for (let k = 0; k < 5; k++) { const x = P[2][0] + s * (-.012 + k * .0105), a = [P[2][0] + s * (-.006 + k * .0045), .055, P[2][2] + .02], b = [x, .022, .105], c = [x, .017, .13 - (k == 4 ? .01 : 0)], d = [x, .013, .148 - (k == 4 ? .02 : 0)];
    LB(a, b, .0065, 1.5); LB(b, c, .0048, 1.4); if (k < 4) LB(c, d, .0038, 1.3); } });

/* =================== SISTEMA NERVIOSO =================== */
const brain = new THREE.Group(); brain.position.set(0, 1.67, 0); G.nerv.add(brain);
const addBrain = (m) => { m.userData = { kind: 'brain' }; clickables.push(m); };
[-1, 1].forEach(s => { const g = new THREE.SphereGeometry(1, 96, 72), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i);
    if (v.x * s < 0) v.x *= .2; if (v.y < -.2) v.y = -.2 + (v.y + .2) * .6;
    const w = Math.sin(9 * v.y + 7 * v.z + 3 * v.x), f = Math.sin(24 * v.x + 3 * w + 18 * v.z) * Math.sin(21 * v.y + 2 * w + 10 * v.z);
    v.multiplyScalar(1 - .07 * Math.pow(1 - Math.abs(f), 4)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); addBrain(mesh(g, brainM, brain, [s * .016, 0, 0], [.058, .054, .079]));
  addBrain(mesh(new THREE.SphereGeometry(1, 28, 20), brainM, brain, [s * .046, -.03, .012], [.024, .02, .04])); });
const cg = new THREE.SphereGeometry(1, 40, 28), cq = cg.attributes.position, cvv = new THREE.Vector3();
for (let i = 0; i < cq.count; i++) { cvv.fromBufferAttribute(cq, i); cvv.multiplyScalar(1 + .045 * Math.sin(cvv.y * 60)); cq.setXYZ(i, cvv.x, cvv.y, cvv.z); }
cg.computeVertexNormals(); addBrain(mesh(cg, brainM, brain, [0, -.045, -.06], [.045, .026, .036]));
tube([[0, 1.64, -.03], [0, 1.6, -.035], [0, 1.56, -.04]], .011, brainM, G.nerv);
const cord = tube(sp.getPoints(24).map(p => [p.x, p.y, p.z - .022]), .0075, cordM, G.nerv); pulse(cord, 'n', G.nerv, 6, .25); CN.push(cord);
sym([[0, 1.45, -.057], [.05, 1.43, -.05], [.12, 1.42, -.03], [.19, 1.38, -.015], [.225, 1.25, -.02], [.24, 1.12, -.01], [.265, 1.0, .015], [.285, .88, .03], [.295, .8, .04]], .0032, nerveM, G.nerv, 'n', 3, .3);
sym([[0, .99, -.045], [.05, .93, -.05], [.09, .85, -.04], [.1, .7, -.03], [.1, .5, -.02], [.098, .4, -.02], [.09, .2, -.005], [.09, .09, .01], [.095, .04, .1]], .0042, nerveM, G.nerv, 'n', 4, .3);
sym([[.015, 1.62, -.03], [.03, 1.52, .005], [.035, 1.42, .02], [.03, 1.3, .04], [.01, 1.18, .05], [0, 1.05, .04]], .0025, nerveM, G.nerv, 'n', 2, .25);
sym([[.033, 1.67, .08], [.02, 1.67, .05], [.01, 1.667, .02]], .0025, nerveM, G.nerv);

/* =================== SISTEMA CIRCULATORIO =================== */
const heart = new THREE.Group(); heart.position.set(.02, 1.265, .04); heart.rotation.set(.1, -.25, .45); G.vasc.add(heart);
const blob = (s, p, taper) => { const g = new THREE.SphereGeometry(1, 40, 30), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i); if (taper && v.y < 0) { const k = 1 - taper * -v.y; v.x *= k; v.z *= k; }
    v.multiplyScalar(1 + .02 * Math.sin(v.x * 9 + v.y * 7) * Math.sin(v.z * 8)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); const m = mesh(g, heartM, heart, p, s); m.userData = { kind: 'heart' }; clickables.push(m); };
blob([.038, .056, .036], [.012, -.012, 0], .55);   // ventrículo izquierdo
blob([.032, .046, .03], [-.024, -.004, .014], .4); // ventrículo derecho
blob([.024, .026, .024], [-.032, .042, -.004], 0); // aurícula derecha
blob([.021, .02, .02], [.02, .046, -.022], 0);     // aurícula izquierda
blob([.012, .014, .01], [-.045, .052, .012], 0);   // orejuela
tube([[-.012, .04, .026], [-.004, .07, .02], [.02, .085, -.004], [.045, .08, -.03]], .011, veinM, heart);          // arteria pulmonar
tube([[.005, .052, .03], [.012, .02, .036], [.016, -.015, .033], [.014, -.05, .018]], .0028, artM, heart);         // coronaria descendente
tube([[-.008, .05, .03], [-.036, .03, .034], [-.052, 0, .03], [-.04, -.03, .026]], .0028, artM, heart);            // coronaria derecha
tube([[.01, .05, .025], [.035, .04, .012], [.05, .01, 0], [.044, -.02, -.012]], .0026, artM, heart);               // circunfleja
const aorta = tube([[.015, 1.3, .035], [.012, 1.37, .03], [0, 1.42, 0], [.03, 1.415, -.03], [.045, 1.34, -.055], [.035, 1.2, -.06], [.02, 1.05, -.045], [0, .95, -.025]], .0115, artM, G.vasc); pulse(aorta, 'a', G.vasc, 6, .18); CA.push(aorta);
[[[-.02, 1.31, .03], [-.02, 1.38, .015], [-.015, 1.46, .01], [-.01, 1.54, .015]], [[-.02, 1.22, .03], [-.025, 1.15, 0], [-.025, 1.05, -.03], [-.015, .95, -.035]]].forEach(P => { const c = tube(P, .0095, veinM, G.vasc); pulse(c, 'v', G.vasc, 3, .14, true); CV.push(c); });
sym([[0, .95, -.025], [.05, .9, 0], [.085, .8, .02], [.09, .6, .03], [.095, .48, .028], [.095, .3, .012], [.09, .1, .022], [.095, .045, .075]], .0075, artM, G.vasc, 'a', 4, .14);
sym([[0, .95, -.035], [.055, .88, -.02], [.1, .8, -.015], [.105, .6, -.012], [.105, .48, -.02], [.1, .3, -.02], [.095, .1, -.005], [.1, .045, .07]], .0075, veinM, G.vasc, 'v', 4, .12, true);
sym([[.01, 1.41, .012], [.1, 1.425, 0], [.19, 1.385, 0], [.225, 1.25, 0], [.24, 1.12, .005], [.265, 1, .025], [.285, .88, .04], [.292, .78, .045]], .005, artM, G.vasc, 'a', 3, .16);
sym([[.01, 1.45, .01], [.12, 1.44, .02], [.205, 1.37, .02], [.245, 1.22, .02], [.255, 1.1, .03], [.28, .92, .05], [.295, .78, .05]], .005, veinM, G.vasc, 'v', 3, .12, true);
sym([[.005, 1.42, .012], [.02, 1.5, .022], [.024, 1.58, .028], [.02, 1.63, .025]], .005, artM, G.vasc, 'a', 2, .14);
sym([[.012, 1.4, .015], [.032, 1.48, .012], [.034, 1.56, 0], [.03, 1.63, -.01]], .006, veinM, G.vasc, 'v', 2, .12, true);
mesh(new THREE.TorusGeometry(.02, .0028, 8, 24), artM, G.vasc, [0, 1.628, .02]).rotation.x = Math.PI / 2;

/* ramificaciones finas (capilares y filamentos nerviosos) con una sola malla de líneas por tipo */
const rnd = (() => { let s = 7; return () => (s = s * 16807 % 2147483647) / 2147483647; })();
const grow = (p, d, l, dep, out) => { const q = p.clone().add(d.clone().multiplyScalar(l)); out.push(p.x, p.y, p.z, q.x, q.y, q.z);
  if (dep > 0) for (let k = 0; k < 2; k++) grow(q, d.clone().add(new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(1.1)).normalize(), l * .7, dep - 1, out); };
const twigs = (curves, n, len, dep, color, op, g) => { const out = [];
  curves.forEach(c => { for (let i = 0; i < n; i++) { const t = .05 + .9 * i / n, p = c.getPointAt(t), tg = c.getTangentAt(t);
    grow(p, new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).cross(tg).normalize().add(tg.clone().multiplyScalar(.6)).normalize(), len, dep, out); } });
  const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.add(new THREE.LineSegments(gm, new THREE.LineBasicMaterial({ color: C(color), transparent: true, opacity: op }))); };
twigs(CA, 12, .04, 3, 0xff4d63, .75, G.vasc); twigs(CV, 12, .04, 3, 0x4666ff, .7, G.vasc); twigs(CN, 16, .045, 2, 0xf6e3a8, .8, G.nerv);

/* ---------- modelos GLTF opcionales ---------- */
const FX = { brain: { v: 0, ms: [brainM], base: .04 }, heart: { v: 0, ms: [heartM], base: .06 } };
if (THREE.GLTFLoader) { const gl = new THREE.GLTFLoader(), map = { esqueleto: 'bone', nervioso: 'nerv', vascular: 'vasc' };
  for (const n in MODELOS) if (MODELOS[n]) gl.load(MODELOS[n], gltf => { const o = gltf.scene, b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.76 / sz.y;
    o.scale.setScalar(k); o.position.set(-c.x * k, -b.min.y * k, -c.z * k); G[map[n]].visible = false; ROOT[map[n]].add(o);
    o.traverse(m => { if (!m.isMesh) return; const kind = NOMBRE_CEREBRO.test(m.name) ? 'brain' : NOMBRE_CORAZON.test(m.name) ? 'heart' : null; if (!kind) return;
      m.userData = { kind }; clickables.push(m); m.material = m.material.clone(); if (m.material.emissive) { m.material.emissive.set(kind == 'brain' ? 0xff3d77 : 0xff2457); FX[kind].ms.push(m.material); } });
  }, undefined, e => console.warn('No se pudo cargar', MODELOS[n], e)); }

/* ---------- ambiente ---------- */
const tex = (() => { const k = document.createElement('canvas'); k.width = k.height = 64; const x = k.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(k); })();
const halo = (c, sz, g) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C(c), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); s.scale.setScalar(sz); g.add(s); return s; };
FX.brain.h = halo(0xff6a9c, .5, brain); FX.heart.h = halo(0xff2d5f, .42, heart);
const fl = new THREE.Mesh(new THREE.CircleGeometry(.65, 48), new THREE.MeshBasicMaterial({ map: tex, color: C(0xff7aa2), transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }));
fl.rotation.x = -Math.PI / 2; fl.position.y = .002; scene.add(fl);
const N = 90, pp = new Float32Array(N * 3); for (let i = 0; i < N; i++) pp.set([(Math.random() - .5) * 3, Math.random() * 2.4, (Math.random() - .5) * 3], i * 3);
const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ map: tex, color: C(0xffb3c6), size: .07, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })));

/* ---------- interacción: resaltado, modal y capas ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), on = { bone: true, nerv: true, vasc: true };
const vis = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
let hover = null, active = null, dn = null, W = 1, H = 1, modalOpen = false, lastFocus = null;
const modal = document.getElementById('modal');
const pick = e => { const r = cv.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera);
  const h = ray.intersectObjects(clickables.filter(vis), false)[0]; return h ? h.object.userData.kind : null; };
const openModal = k => { active = k; modalOpen = true; controls.autoRotate = false; lastFocus = document.activeElement;
  document.getElementById('mt').textContent = k == 'brain' ? TITULO_CEREBRO : TITULO_CORAZON;
  document.getElementById('mp').textContent = k == 'brain' ? MENSAJE_CEREBRO : MENSAJE_CORAZON;
  modal.hidden = false; requestAnimationFrame(() => modal.classList.add('on')); document.getElementById('mx').focus(); };
const closeModal = () => { if (!modalOpen) return; modalOpen = false; active = null; modal.classList.remove('on'); setTimeout(() => modal.hidden = true, 300); if (lastFocus) lastFocus.focus(); };
document.getElementById('mx').onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key == 'Escape') closeModal(); });
cv.addEventListener('pointermove', e => { if (e.buttons) return; hover = pick(e); cv.style.cursor = hover ? 'pointer' : ''; });
cv.addEventListener('pointerleave', () => hover = null);
cv.addEventListener('pointerdown', e => dn = [e.clientX, e.clientY]);
cv.addEventListener('pointerup', e => { if (!dn) return; const d = Math.hypot(e.clientX - dn[0], e.clientY - dn[1]); dn = null; if (d > 6) return; const k = pick(e); if (k) openModal(k); });
const sync = () => { for (const s in ROOT) ROOT[s].visible = on[s]; const o = on.nerv || on.vasc; boneM.transparent = o; boneM.opacity = o ? .22 : 1; boneM.depthWrite = !o; boneM.needsUpdate = true; };
document.querySelectorAll('#chips button').forEach(b => b.onclick = () => { const s = b.dataset.s; on[s] = !on[s]; b.setAttribute('aria-pressed', on[s]); sync(); });
sync();

/* ---------- barra de mensajes → Discord + corazones ---------- */
const form = document.getElementById('msgbar'), input = document.getElementById('msg'), send = document.getElementById('send'), st = document.getElementById('status'), hearts = document.getElementById('hearts');
const floatHearts = () => { for (let i = 0; i < 24; i++) { const s = document.createElement('span'); s.textContent = '♥';
  s.style.cssText = `--x:${8 + Math.random() * 84}%;--s:${14 + Math.random() * 26}px;--c:${['#ff7aa2', '#ffb8cb', '#ff4d6d', '#ffd1dc'][i % 4]};--t:${2.6 + Math.random() * 1.8}s;--d:${Math.random() * .7}s;--w:${(Math.random() - .5) * 90}px`;
  hearts.appendChild(s); setTimeout(() => s.remove(), 5000); } };
form.addEventListener('submit', async e => { e.preventDefault(); const text = input.value.trim(); if (!text) return; send.disabled = true; st.className = ''; st.textContent = 'Enviando…';
  try { const r = await fetch('/api/send-to-discord', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    if (!r.ok) throw new Error(r.status); input.value = ''; st.textContent = 'Mensaje enviado'; floatHearts(); setTimeout(() => { if (st.textContent == 'Mensaje enviado') st.textContent = ''; }, 4000);
  } catch (err) { st.className = 'err'; st.textContent = 'No se ha podido enviar. Inténtalo de nuevo.'; } finally { send.disabled = false; } });

/* ---------- bucle ---------- */
const fit = () => { W = stage.clientWidth || 1; H = stage.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
new ResizeObserver(fit).observe(stage); fit();
let ph = 0; const clock = new THREE.Clock();
(function loop() { requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime; controls.update();
  ph += dt * (1 + .5 * FX.heart.v); const p = ph % 1, b = Math.exp(-(((p - .08) * 16) ** 2)) + .6 * Math.exp(-(((p - .3) * 16) ** 2)); heart.scale.setScalar(1 + .08 * b);
  for (const k in FX) { const f = FX[k], tg = (hover == k || active == k) ? 1 : 0; f.v += (tg - f.v) * Math.min(1, dt * 7); const id = .5 + .5 * Math.sin(t * 1.8 + (k == 'brain' ? 0 : 2));
    f.ms.forEach(m => m.emissiveIntensity = f.base + .05 * id + f.v * .9); f.h.material.opacity = f.v * (.7 + .3 * (k == 'heart' ? b : id)) + .05 * id; }
  pulses.forEach(q => { q.t = (q.t + dt * q.s) % 1; q.m.position.copy(q.c.getPointAt(q.r ? 1 - q.t : q.t)); });
  for (let i = 0; i < N; i++) { pp[i * 3 + 1] += dt * .04; if (pp[i * 3 + 1] > 2.4) pp[i * 3 + 1] = 0; } pgeo.attributes.position.needsUpdate = true;
  renderer.render(scene, camera); })();
})();
