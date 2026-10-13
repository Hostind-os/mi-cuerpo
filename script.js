// ============================================================
//  ✏️  TEXTOS PERSONALIZADOS: cambia aquí lo que se lee en las tarjetas
// ============================================================
const MENSAJE_CORAZON = "Este corazón late por ti.\nSi hoy todo va muy rápido, ven y abrázame hasta que baje el ritmo.";
const MENSAJE_CEREBRO = "Respira hondo. Tu cabeza no tiene que resolverlo todo hoy.\nYo me encargo de que te rías un rato.";
const TITULO_CORAZON = "Mi corazón";
const TITULO_CEREBRO = "Tu mente";

// ============================================================
//  🎨 ASPECTO DE LA CAPA "CUERPO" (piel, pelo y ojos)
// ============================================================
const COLOR_PIEL = 0xf4c6b8;  // Tono de piel cálido y natural
const COLOR_PELO = 0x4a2f27;  // Cabello castaño oscuro profundo
const COLOR_OJOS = 0x5a3825;  // Iris detallado
const PELO_LARGO = false;     // false = pelo corto estilizado, true = melena larga

// ============================================================
//  🧍 MODELOS 3D REALES (OPCIONAL)
// ============================================================
const MODELOS = { esqueleto: "", nervioso: "", vascular: "" };
const NOMBRE_CEREBRO = /brain|cerebro/i, NOMBRE_CORAZON = /heart|coraz/i;

// ============================================================
(() => {
const stage = document.getElementById('stage'), cv = document.getElementById('c');
const fail = () => stage.insertAdjacentHTML('beforeend', '<p style="margin:auto;padding:2rem;text-align:center;position:relative;color:#ff8aa5">No se pudo cargar el visor 3D. Revisa la conexión y recarga la página.</p>');
if (!window.THREE || !THREE.OrbitControls) return fail();
let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return fail(); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .05, 50);
camera.position.set(1.1, 1.2, 3.3);
const controls = new THREE.OrbitControls(camera, cv);
controls.target.set(0, .86, 0); controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = .5; controls.maxDistance = 7; controls.autoRotate = true; controls.autoRotateSpeed = 1.0;
let idle; controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
controls.addEventListener('end', () => { idle = setTimeout(() => controls.autoRotate = !modalOpen, 6000); });

/* ---------- iluminación avanzada (cálida, envolvente y cinematográfica) ---------- */
const C = h => new THREE.Color(h).convertSRGBToLinear();
scene.add(new THREE.HemisphereLight(C(0xffe1ec), C(0x3a1f2b), 1.1));
const key = new THREE.DirectionalLight(C(0xfff5ee), 1.5); key.position.set(2.5, 3.5, 3); scene.add(key);
const rim = new THREE.DirectionalLight(C(0xff759e), 1.8); rim.position.set(-3.5, 2.5, -3); scene.add(rim);
const fill = new THREE.PointLight(C(0xffb8cb), 1.2, 8); fill.position.set(-1.5, 1.2, 2); scene.add(fill);

/* ---------- materiales estilizados con alta fidelidad visual y rim lighting ---------- */
const V = a => new THREE.Vector3(...a), mir = p => [-p[0], p[1], p[2]], UP = new THREE.Vector3(0, 1, 0);
const M = (c, o = {}) => { const m = new THREE.MeshPhysicalMaterial(Object.assign({ roughness: .5 }, o, { color: C(c) })); if (o.emissive) m.emissive = C(o.emissive); return m; };
const rimify = (m, hex, k) => { m.onBeforeCompile = sh => { sh.uniforms.uRim = { value: C(hex).multiplyScalar(k) };
  sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', 'gl_FragColor.rgb += pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.8) * uRim;\n#include <dithering_fragment>'); }; return m; };

const boneM = rimify(M(0xf5efe6, { roughness: .4, clearcoat: .4, clearcoatRoughness: .3, emissive: 0x4a323a, emissiveIntensity: .25 }), 0xffa3be, .4),
toothM = M(0xfcf8f2, { roughness: .25, clearcoat: .6 }), darkM = M(0x24151b, { roughness: .9 }),
brainM = rimify(M(0xf5b2c0, { roughness: .45, clearcoat: .8, clearcoatRoughness: .25, emissive: 0xff3b75, emissiveIntensity: .06 }), 0xffd1dc, .35),
heartM = rimify(M(0xdc2f48, { roughness: .35, clearcoat: 1, clearcoatRoughness: .15, emissive: 0xff2253, emissiveIntensity: .08 }), 0xffa3b5, .4),
artM = rimify(M(0xeb445e, { roughness: .3, clearcoat: .75, emissive: 0x5a0a16 }), 0xffa3b5, .35), 
veinM = rimify(M(0x4360e0, { roughness: .3, clearcoat: .75, emissive: 0x0c1652 }), 0xa8baff, .35),
nerveM = rimify(M(0xfaeec2, { roughness: .45, emissive: 0x7a6524 }), 0xfff5cc, .35), 
cordM = M(0xfff8e0, { roughness: .35, emissive: 0x8c7535 });

// Piel con simulación de Subsurface Scattering y translucidez animada
const skinU = { uA: { value: .12 }, t: .12 };
const skinM = M(COLOR_PIEL, { roughness: .55, emissive: 0x753245, emissiveIntensity: .32, transparent: true, depthWrite: false });
skinM.onBeforeCompile = sh => { sh.uniforms.uA = skinU.uA;
  sh.fragmentShader = 'uniform float uA;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', 'float fr = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);\ngl_FragColor.a = clamp(uA + fr * .65, 0., .96);\ngl_FragColor.rgb += fr * vec3(1.0, .38, .5) * .55;\n#include <dithering_fragment>'); };

const hairM = rimify(M(COLOR_PELO, { roughness: .3, clearcoat: .8, clearcoatRoughness: .25, emissive: 0x35141f, emissiveIntensity: .6 }), 0xffa3be, .45),
eyeM = M(0xfffaf7, { roughness: .15, clearcoat: 1 }), irisM = M(COLOR_OJOS, { roughness: .25, clearcoat: 1, emissive: COLOR_OJOS, emissiveIntensity: .35 }),
pupilM = M(0x12080c, { roughness: .3 }), glintM = new THREE.MeshBasicMaterial({ color: 0xffffff }), lipM = M(0xe87f92, { roughness: .35, clearcoat: .6 });

const ROOT = { body: new THREE.Group(), bone: new THREE.Group(), nerv: new THREE.Group(), vasc: new THREE.Group() };
const G = { body: new THREE.Group(), bone: new THREE.Group(), nerv: new THREE.Group(), vasc: new THREE.Group() };
for (const s in G) { ROOT[s].add(G[s]); scene.add(ROOT[s]); }

/* ---------- utilidades de construcción ---------- */
const clickables = [], pulses = [], CA = [], CV = [], CN = [];
const mesh = (geo, mat, g, p, s) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); if (s) m.scale.set(...s); g.add(m); return m; };
const tube = (pts, r, mat, g) => { const c = new THREE.CatmullRomCurve3(pts.map(V)); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(16, pts.length * 12), r, 10, false), mat)); return c; };
const pg = new THREE.SphereGeometry(.007, 10, 8), pm = { n: new THREE.MeshBasicMaterial({ color: C(0xfffae0) }), a: new THREE.MeshBasicMaterial({ color: C(0xff9fb0) }), v: new THREE.MeshBasicMaterial({ color: C(0xb0c2ff) }) };
const pulse = (c, k, g, n, s, r) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(pg, pm[k]); g.add(m); pulses.push({ c, m, t: i / n, s: s * (.9 + Math.random() * .25), r }); } };
const sym = (pts, r, mat, g, k, n, s, rev) => [pts, pts.map(mir)].forEach(P => { const c = tube(P, r, mat, g); if (k) { pulse(c, k, g, n, s, rev); (k == 'a' ? CA : k == 'v' ? CV : CN).push(c); } });
const LB = (a, b, r, e = 1.85) => { const A = V(a), B = V(b), h = A.distanceTo(B) / 2;
  const pr = new THREE.SplineCurve([[0, -h], [r * e * .8, -h], [r * e * 1.05, -h * .92], [r * 1.25, -h * .68], [r * .88, -h * .32], [r * .82, 0], [r * .88, h * .32], [r * 1.25, h * .68], [r * e * 1.1, h * .92], [r * e * .8, h], [0, h]].map(p => new THREE.Vector2(...p))).getPoints(32).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pr, 20), boneM); m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); G.bone.add(m); };

/* =================== ESQUELETO REFINADO =================== */
const sk = new THREE.SphereGeometry(1, 56, 40), sq = sk.attributes.position, tv = new THREE.Vector3();
for (let i = 0; i < sq.count; i++) { tv.fromBufferAttribute(sq, i); if (tv.y < -.45) { tv.y = -.45 + (tv.y + .45) * .38; tv.x *= .84; } if (tv.z > .5) tv.x *= 1 - .14 * (tv.z - .5); sq.setXYZ(i, tv.x, tv.y, tv.z); }
sk.computeVertexNormals(); mesh(sk, boneM, G.bone, [0, 1.67, 0], [.076, .087, .096]);
mesh(new THREE.SphereGeometry(1, 24, 16), boneM, G.bone, [0, 1.615, .062], [.049, .035, .037]);
[-1, 1].forEach(s => {
  mesh(new THREE.SphereGeometry(1, 16, 12), darkM, G.bone, [s * .033, 1.668, .09], [.019, .018, .011]);
  const rim = mesh(new THREE.TorusGeometry(.019, .004, 10, 24), boneM, G.bone, [s * .033, 1.668, .094]); rim.scale.y = .9;
  tube([[s * .05, 1.645, .07], [s * .082, 1.64, .02], [s * .072, 1.634, -.02]], .004, boneM, G.bone);
  mesh(new THREE.SphereGeometry(1, 12, 10), boneM, G.bone, [s * .044, 1.632, .082], [.011, .009, .008]);
});
mesh(new THREE.SphereGeometry(1, 12, 10), darkM, G.bone, [0, 1.634, .097], [.011, .015, .008]);
tube([[-.048, 1.635, -.012], [-.046, 1.59, -.005], [-.034, 1.565, .03], [-.015, 1.552, .062], [0, 1.55, .07], [.015, 1.552, .062], [.034, 1.565, .03], [.046, 1.59, -.005], [.048, 1.635, -.012]], .008, boneM, G.bone);
[1.594, 1.572].forEach(y => { for (let i = -5; i <= 5; i++) { const a = i * .2, m = mesh(new THREE.BoxGeometry(.006, .011, .005), toothM, G.bone, [.027 * Math.sin(a), y, .04 + .03 * Math.cos(a)]); m.rotation.y = a; } });

// Columna vertebral con curvatura natural anatómica
const sp = new THREE.CatmullRomCurve3([[0, 1.56, -.03], [0, 1.46, -.036], [0, 1.38, -.062], [0, 1.28, -.078], [0, 1.18, -.068], [0, 1.10, -.042], [0, 1.02, -.026], [0, .95, -.032], [0, .88, -.058]].map(V));
const spZ = y => sp.getPoint(Math.min(1, Math.max(0, (1.56 - y) / .68))).z;
for (let i = 0; i < 24; i++) { const t = i / 23 * .9, p = sp.getPoint(t);
  mesh(new THREE.CylinderGeometry(.015 + .011 * t, .017 + .012 * t, .02, 16), boneM, G.bone, [p.x, p.y, p.z]);
  const sp2 = mesh(new THREE.BoxGeometry(.005, .014, .026), boneM, G.bone, [p.x, p.y - .003, p.z - .03 - .012 * t]); sp2.rotation.x = .5;
  mesh(new THREE.BoxGeometry(.04 + .06 * t, .004, .008), boneM, G.bone, [p.x, p.y, p.z - .02]); }
mesh(new THREE.SphereGeometry(1, 18, 14), boneM, G.bone, [0, .895, -.05], [.033, .058, .02]);

// Caja torácica suave y estilizada
const ribW = [.07, .09, .105, .115, .12, .122, .12, .115, .105, .095], ribD = [.05, .06, .07, .075, .08, .08, .078, .075, .07, .065];
for (let i = 0; i < 10; i++) { const y = 1.41 - i * .03, d = ribD[i], w = ribW[i], zc = spZ(y) + d, pts = [];
  for (let k = 0; k <= 10; k++) { const f = Math.PI - k / 10 * (Math.PI - .14); pts.push([w * Math.sin(f), y - .045 * k / 10, zc + d * Math.cos(f)]); }
  sym(pts, .0052, boneM, G.bone);
  sym([[0, y, spZ(y) - .022]].concat(pts.map(p => [p[0] * .97, p[1] - .01, p[2]])), .0024, nerveM, G.nerv); }
mesh(new THREE.SphereGeometry(1, 16, 12), boneM, G.bone, [0, 1.40, .052], [.027, .027, .008]);
const stn = mesh(new THREE.BoxGeometry(.023, .15, .01), boneM, G.bone, [0, 1.285, .073]); stn.rotation.x = -.24;
mesh(new THREE.ConeGeometry(.007, .03, 10), boneM, G.bone, [0, 1.18, .094]).rotation.x = Math.PI;

const scS = new THREE.Shape(); scS.moveTo(-.05, .06); scS.lineTo(.06, .07); scS.lineTo(.078, .04); scS.lineTo(.02, -.02); scS.lineTo(0, -.1); scS.lineTo(-.05, -.03); scS.closePath();
const scG = new THREE.ExtrudeGeometry(scS, { depth: .004, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 3 });
[1, -1].forEach(s => { const m = mesh(scG, boneM, G.bone, [s * .09, 1.34, -.058]); m.rotation.y = -.4 * s; m.scale.x = s; });
[[.012, 1.405, .05], [.19, 1.415, -.005]].forEach((p, i, a) => { if (i) { LB(a[0], a[1], .008, 1.4); LB(mir(a[0]), mir(a[1]), .008, 1.4); } });

// Extremidades superiores e inferiores con falanges detalladas
const hand = (W, s) => { const L = [.032, .04, .043, .04, .032];
  for (let k = -2; k <= 2; k++) { const j = k + 2; let a = [W[0] + s * k * .004, W[1] - .01, W[2] + .004], b = [W[0] + s * (k * .0095 + .004), .805, W[2] + .02]; LB(a, b, .004, 1.5);
    let d = [s * k * .0016, -1, .1]; const n = Math.hypot(...d); d = d.map(v => v / n);
    for (let f = 0; f < 3; f++) { const l = L[j] * [.45, .32, .23][f], c = [b[0] + d[0] * l, b[1] + d[1] * l, b[2] + d[2] * l]; LB(b, c, .0035 - f * .0004, 1.4); b = c; } } };
const arm = [[.195, 1.405, -.01], [.235, 1.12, -.02], [.28, .88, .02]];
[arm, arm.map(mir)].forEach(P => { const s = Math.sign(P[1][0]);
  LB(P[0], P[1], .012, 2); LB(P[1], P[2], .0072, 1.9);
  LB([P[1][0] + s * .01, P[1][1], P[1][2] - .01], [P[2][0] + s * .008, P[2][1], P[2][2] - .008], .0065, 1.9); hand(P[2], s); });

[.095, -.095].forEach(x => { const s = Math.sign(x), m = mesh(new THREE.SphereGeometry(1, 22, 16), boneM, G.bone, [x, .945, -.01], [.074, .064, .025]); m.rotation.set(0, -.45 * s, -.35 * s);
  const cr = mesh(new THREE.TorusGeometry(.07, .0075, 10, 24, Math.PI * .8), boneM, G.bone, [x, .975, -.01]); cr.rotation.set(Math.PI / 2 - .5, 0, s * .3); });
const pr = mesh(new THREE.TorusGeometry(.095, .012, 10, 28), boneM, G.bone, [0, .86, 0], [1, 1, 1]); pr.rotation.x = Math.PI / 2;
const leg = [[.09, .86, -.005], [.095, .48, .01], [.09, .085, -.005]];
[leg, leg.map(mir)].forEach(P => { const s = Math.sign(P[1][0]);
  mesh(new THREE.SphereGeometry(.025, 16, 12), boneM, G.bone, P[0]);
  LB(P[0], P[1], .019, 2.1); LB(P[1], P[2], .015, 2);
  LB([P[1][0] + s * .03, P[1][1] - .01, P[1][2] - .005], [P[2][0] + s * .03, P[2][1] + .04, P[2][2] - .005], .0058, 1.8);
  mesh(new THREE.SphereGeometry(1, 14, 12), boneM, G.bone, [P[1][0], P[1][1] + .005, P[1][2] + .042], [.016, .019, .008]);
  mesh(new THREE.SphereGeometry(1, 14, 12), boneM, G.bone, [P[2][0], .045, P[2][2] - .03], [.019, .027, .038]);
  for (let k = 0; k < 5; k++) { const x = P[2][0] + s * (-.012 + k * .0105), a = [P[2][0] + s * (-.006 + k * .0045), .055, P[2][2] + .02], b = [x, .022, .105], c = [x, .017, .13 - (k == 4 ? .01 : 0)], d = [x, .013, .148 - (k == 4 ? .02 : 0)];
    LB(a, b, .006, 1.5); LB(b, c, .0045, 1.4); if (k < 4) LB(c, d, .0035, 1.3); } });

/* =================== SISTEMA NERVIOSO REFINADO =================== */
const brain = new THREE.Group(); brain.position.set(0, 1.67, 0); G.nerv.add(brain);
const addBrain = (m) => { m.userData = { kind: 'brain' }; clickables.push(m); };
[-1, 1].forEach(s => { const g = new THREE.SphereGeometry(1, 104, 80), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i);
    if (v.x * s < 0) v.x *= .2; if (v.y < -.2) v.y = -.2 + (v.y + .2) * .6;
    const w = Math.sin(10 * v.y + 8 * v.z + 3 * v.x), f = Math.sin(26 * v.x + 3.5 * w + 20 * v.z) * Math.sin(23 * v.y + 2.5 * w + 11 * v.z);
    v.multiplyScalar(1 - .075 * Math.pow(1 - Math.abs(f), 4)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); addBrain(mesh(g, brainM, brain, [s * .016, 0, 0], [.058, .054, .079]));
  addBrain(mesh(new THREE.SphereGeometry(1, 32, 24), brainM, brain, [s * .046, -.03, .012], [.024, .02, .04])); });
const cg = new THREE.SphereGeometry(1, 48, 32), cq = cg.attributes.position, cvv = new THREE.Vector3();
for (let i = 0; i < cq.count; i++) { cvv.fromBufferAttribute(cq, i); cvv.multiplyScalar(1 + .05 * Math.sin(cvv.y * 65)); cq.setXYZ(i, cvv.x, cvv.y, cvv.z); }
cg.computeVertexNormals(); addBrain(mesh(cg, brainM, brain, [0, -.045, -.06], [.045, .026, .036]));
tube([[0, 1.64, -.03], [0, 1.6, -.035], [0, 1.56, -.04]], .011, brainM, G.nerv);
const cord = tube(sp.getPoints(24).map(p => [p.x, p.y, p.z - .022]), .0075, cordM, G.nerv); pulse(cord, 'n', G.nerv, 6, .28); CN.push(cord);
sym([[0, 1.45, -.057], [.05, 1.43, -.05], [.12, 1.42, -.03], [.19, 1.38, -.015], [.225, 1.25, -.02], [.24, 1.12, -.01], [.265, 1.0, .015], [.285, .88, .03], [.295, .8, .04]], .003, nerveM, G.nerv, 'n', 3, .32);
sym([[0, .99, -.045], [.05, .93, -.05], [.09, .85, -.04], [.1, .7, -.03], [.1, .5, -.02], [.098, .4, -.02], [.09, .2, -.005], [.09, .09, .01], [.095, .04, .1]], .004, nerveM, G.nerv, 'n', 4, .32);
sym([[.015, 1.62, -.03], [.03, 1.52, .005], [.035, 1.42, .02], [.03, 1.3, .04], [.01, 1.18, .05], [0, 1.05, .04]], .0024, nerveM, G.nerv, 'n', 2, .28);
sym([[.033, 1.67, .08], [.02, 1.67, .05], [.01, 1.667, .02]], .0024, nerveM, G.nerv);

/* =================== SISTEMA CIRCULATORIO REFINADO =================== */
const heart = new THREE.Group(); heart.position.set(.02, 1.265, .04); heart.rotation.set(.1, -.25, .45); G.vasc.add(heart);
const blob = (s, p, taper) => { const g = new THREE.SphereGeometry(1, 44, 32), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i); if (taper && v.y < 0) { const k = 1 - taper * -v.y; v.x *= k; v.z *= k; }
    v.multiplyScalar(1 + .022 * Math.sin(v.x * 9.5 + v.y * 7.5) * Math.sin(v.z * 8.5)); q.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); const m = mesh(g, heartM, heart, p, s); m.userData = { kind: 'heart' }; clickables.push(m); };
blob([.039, .058, .037], [.012, -.012, 0], .58);   // Ventrículo izquierdo
blob([.033, .048, .031], [-.024, -.004, .014], .42); // Ventrículo derecho
blob([.025, .027, .025], [-.032, .042, -.004], 0); // Aurícula derecha
blob([.022, .021, .021], [.02, .046, -.022], 0);     // Aurícula izquierda
blob([.013, .015, .011], [-.045, .052, .012], 0);   // Orejuela

tube([[-.012, .04, .026], [-.004, .07, .02], [.02, .085, -.004], [.045, .08, -.03]], .0105, veinM, heart);          // Arteria pulmonar
tube([[.005, .052, .03], [.012, .02, .036], [.016, -.015, .033], [.014, -.05, .018]], .0027, artM, heart);         // Coronaria descendente
tube([[-.008, .05, .03], [-.036, .03, .034], [-.052, 0, .03], [-.04, -.03, .026]], .0027, artM, heart);            // Coronaria derecha
tube([[.01, .05, .025], [.035, .04, .012], [.05, .01, 0], [.044, -.02, -.012]], .0025, artM, heart);               // Circunfleja

const aorta = tube([[.015, 1.3, .035], [.012, 1.37, .03], [0, 1.42, 0], [.03, 1.415, -.03], [.045, 1.34, -.055], [.035, 1.2, -.06], [.02, 1.05, -.045], [0, .95, -.025]], .0112, artM, G.vasc); pulse(aorta, 'a', G.vasc, 6, .2); CA.push(aorta);
[[[-.02, 1.31, .03], [-.02, 1.38, .015], [-.015, 1.46, .01], [-.01, 1.54, .015]], [[-.02, 1.22, .03], [-.025, 1.15, 0], [-.025, 1.05, -.03], [-.015, .95, -.035]]].forEach(P => { const c = tube(P, .0092, veinM, G.vasc); pulse(c, 'v', G.vasc, 3, .15, true); CV.push(c); });
sym([[0, .95, -.025], [.05, .9, 0], [.085, .8, .02], [.09, .6, .03], [.095, .48, .028], [.095, .3, .012], [.09, .1, .022], [.095, .045, .075]], .0072, artM, G.vasc, 'a', 4, .15);
sym([[0, .95, -.035], [.055, .88, -.02], [.1, .8, -.015], [.105, .6, -.012], [.105, .48, -.02], [.1, .3, -.02], [.095, .1, -.005], [.1, .045, .07]], .0072, veinM, G.vasc, 'v', 4, .13, true);
sym([[.01, 1.41, .012], [.1, 1.425, 0], [.19, 1.385, 0], [.225, 1.25, 0], [.24, 1.12, .005], [.265, 1, .025], [.285, .88, .04], [.292, .78, .045]], .0048, artM, G.vasc, 'a', 3, .17);
sym([[.01, 1.45, .01], [.12, 1.44, .02], [.205, 1.37, .02], [.245, 1.22, .02], [.255, 1.1, .03], [.28, .92, .05], [.295, .78, .05]], .0048, veinM, G.vasc, 'v', 3, .13, true);
sym([[.005, 1.42, .012], [.02, 1.5, .022], [.024, 1.58, .028], [.02, 1.63, .025]], .0048, artM, G.vasc, 'a', 2, .15);
sym([[.012, 1.4, .015], [.032, 1.48, .012], [.034, 1.56, 0], [.03, 1.63, -.01]], .0058, veinM, G.vasc, 'v', 2, .13, true);
mesh(new THREE.TorusGeometry(.02, .0027, 10, 28), artM, G.vasc, [0, 1.628, .02]).rotation.x = Math.PI / 2;

/* capilares y microfilamentos orgánicos */
const rnd = (() => { let s = 13; return () => (s = s * 16807 % 2147483647) / 2147483647; })();
const grow = (p, d, l, dep, out) => { const q = p.clone().add(d.clone().multiplyScalar(l)); out.push(p.x, p.y, p.z, q.x, q.y, q.z);
  if (dep > 0) for (let k = 0; k < 2; k++) grow(q, d.clone().add(new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(1.15)).normalize(), l * .72, dep - 1, out); };
const twigs = (curves, n, len, dep, color, op, g) => { const out = [];
  curves.forEach(c => { for (let i = 0; i < n; i++) { const t = .05 + .9 * i / n, p = c.getPointAt(t), tg = c.getTangentAt(t);
    grow(p, new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).cross(tg).normalize().add(tg.clone().multiplyScalar(.6)).normalize(), len, dep, out); } });
  const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.add(new THREE.LineSegments(gm, new THREE.LineBasicMaterial({ color: C(color), transparent: true, opacity: op }))); };
twigs(CA, 12, .04, 3, 0xff5c75, .78, G.vasc); twigs(CV, 12, .04, 3, 0x5c7aff, .72, G.vasc); twigs(CN, 16, .045, 2, 0xfff0b8, .82, G.nerv);

/* ---------- modelos GLTF opcionales ---------- */
const FX = { brain: { v: 0, ms: [brainM], base: .06 }, heart: { v: 0, ms: [heartM], base: .08 } };
if (THREE.GLTFLoader) { const gl = new THREE.GLTFLoader(), map = { esqueleto: 'bone', nervioso: 'nerv', vascular: 'vasc' };
  for (const n in MODELOS) if (MODELOS[n]) gl.load(MODELOS[n], gltf => { const o = gltf.scene, b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.76 / sz.y;
    o.scale.setScalar(k); o.position.set(-c.x * k, -b.min.y * k, -c.z * k); G[map[n]].visible = false; ROOT[map[n]].add(o);
    o.traverse(m => { if (!m.isMesh) return; const kind = NOMBRE_CEREBRO.test(m.name) ? 'brain' : NOMBRE_CORAZON.test(m.name) ? 'heart' : null; if (!kind) return;
      m.userData = { kind }; clickables.push(m); m.material = m.material.clone(); if (m.material.emissive) { m.material.emissive.set(kind == 'brain' ? 0xff3b75 : 0xff2253); FX[kind].ms.push(m.material); } });
  }, undefined, e => console.warn('No se pudo cargar', MODELOS[n], e)); }

/* ---------- ambiente luminiscente ---------- */
const tex = (() => { const k = document.createElement('canvas'); k.width = k.height = 64; const x = k.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(k); })();
const halo = (c, sz, g) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C(c), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); s.scale.setScalar(sz); g.add(s); return s; };
FX.brain.h = halo(0xff75a6, .52, brain); FX.heart.h = halo(0xff3b6b, .44, heart);
const fl = new THREE.Mesh(new THREE.CircleGeometry(.65, 48), new THREE.MeshBasicMaterial({ map: tex, color: C(0xff8aa5), transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending }));
fl.rotation.x = -Math.PI / 2; fl.position.y = .002; scene.add(fl);
const N = 100, pp = new Float32Array(N * 3); for (let i = 0; i < N; i++) pp.set([(Math.random() - .5) * 3.2, Math.random() * 2.5, (Math.random() - .5) * 3.2], i * 3);
const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ map: tex, color: C(0xffc2d6), size: .075, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending })));

/* =================== CUERPO REFINADO (Piel, Pelo y Ojos) =================== */
try {
const skin = (geo, p, sc) => { const m = mesh(geo, skinM, G.body, p, sc); m.renderOrder = 5; return m; };
const limb = (a, b, r1, r2) => { const A = V(a), B = V(b), d = B.clone().sub(A), m = skin(new THREE.CylinderGeometry(r2, r1, d.length(), 28, 1, true));
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); skin(new THREE.SphereGeometry(r1, 28, 18), a); skin(new THREE.SphereGeometry(r2, 28, 18), b); };

const tp = new THREE.SplineCurve([[0, .78], [.12, .8], [.155, .88], [.15, .96], [.125, 1.08], [.135, 1.18], [.15, 1.28], [.165, 1.37], [.15, 1.43], [.075, 1.47], [0, 1.48]].map(p => new THREE.Vector2(...p))).getPoints(52).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
skin(new THREE.LatheGeometry(tp, 44), [0, 0, .01], [1, 1, .72]);
limb([0, 1.55, -.02], [0, 1.44, -.03], .043, .053);
skin(new THREE.SphereGeometry(1, 52, 40), [0, 1.665, 0], [.089, .101, .109]);
skin(new THREE.SphereGeometry(1, 36, 28), [0, 1.592, .036], [.061, .057, .075]);
skin(new THREE.SphereGeometry(1, 18, 14), [0, 1.628, .104], [.0088, .0135, .0115]);
mesh(new THREE.SphereGeometry(1, 18, 12), lipM, G.body, [0, 1.583, .108], [.0145, .0048, .0085]);

[1, -1].forEach(s => {
  limb([s * .195, 1.405, -.01], [s * .235, 1.12, -.02], .053, .041); limb([s * .235, 1.12, -.02], [s * .28, .88, .02], .041, .029);
  skin(new THREE.SphereGeometry(1, 22, 16), [s * .285, .79, .04], [.031, .096, .02]);
  limb([s * .09, .87, 0], [s * .095, .48, .01], .079, .057); limb([s * .095, .48, .01], [s * .09, .085, -.005], .053, .035);
  skin(new THREE.SphereGeometry(1, 22, 16), [s * .09, .04, .045], [.035, .043, .112]);
  skin(new THREE.SphereGeometry(1, 14, 12), [s * .089, 1.655, -.008], [.0082, .0205, .0145]);
  
  // Ojos hiper-detallados con iris, pupila, brillos cristalinos y pestañas
  const e = new THREE.Group(); e.position.set(s * .034, 1.668, .097); G.body.add(e);
  mesh(new THREE.SphereGeometry(.013, 28, 22), eyeM, e); 
  mesh(new THREE.CircleGeometry(.0078, 32), irisM, e, [0, 0, .0126]); 
  mesh(new THREE.CircleGeometry(.0037, 24), pupilM, e, [0, 0, .0128]);
  mesh(new THREE.SphereGeometry(.0026, 12, 10), glintM, e, [-.003, .0034, .0135]); 
  mesh(new THREE.SphereGeometry(.0014, 10, 8), glintM, e, [.003, -.0028, .0135]);
  tube([[-.0125, .003, .0108], [-.004, .011, .0118], [.006, .011, .0115], [.0135, .004, .0105]].map(p => [p[0] * s, p[1], p[2]]), .0016, pupilM, e);
  tube([[.019, 1.699, .098], [.033, 1.707, .099], [.048, 1.699, .092]].map(p => [p[0] * s, p[1], p[2]]), .0028, hairM, G.body);
  const bl = halo(0xff9bb8, .052, G.body); bl.position.set(s * .052, 1.622, .082); bl.material.opacity = .42; 
});

// Cabello fluido y orgánico
const hcap = new THREE.SphereGeometry(1, 52, 36, 0, Math.PI * 2, 0, 1.75), hix = hcap.index.array, hps = hcap.attributes.position, keep = [];
for (let i = 0; i < hix.length; i += 3) { let cy = 0, cz = 0; for (let j = 0; j < 3; j++) { cy += hps.getY(hix[i + j]); cz += hps.getZ(hix[i + j]); } if (cz / 3 > .28 && cy / 3 < .62) continue; keep.push(hix[i], hix[i + 1], hix[i + 2]); }
hcap.setIndex(keep); mesh(hcap, hairM, G.body, [0, 1.665, 0], [.093, .106, .114]).renderOrder = 4;
const R = [.095, .109, .117], hy = 1.665, yEnd = PELO_LARGO ? 1.37 : 1.585, strands = [];
for (let i = 0; i < (PELO_LARGO ? 280 : 220); i++) {
  const th = (rnd() * 2 - 1) * Math.PI, fr = Math.abs(th) < 1; let ph = .1 + rnd() * 1.15; if (fr && ph > .75) ph = .12 + rnd() * .6;
  const sg = th < 0 ? -1 : 1, sw = fr ? sg * (1.15 - Math.abs(th)) : 0, drop = rnd() * .03, pts = [], ts = th + sw, ps = 1.72, y0 = hy + R[1] * Math.cos(ps);
  const zS = R[2] * Math.sin(ps) * Math.cos(ts), zE = PELO_LARGO ? Math.min(zS, -.11) : zS - .01;
  for (let k = 0; k <= 14; k++) { const u0 = k / 14; let x, y, z;
    if (u0 < .45) { const u = u0 / .45, p = ph + (ps - ph) * u, t = th + sw * u; x = R[0] * Math.sin(p) * Math.sin(t); y = hy + R[1] * Math.cos(p); z = R[2] * Math.sin(p) * Math.cos(t); }
    else { const u = (u0 - .45) / .55; x = R[0] * Math.sin(ps) * Math.sin(ts) * (1 + (PELO_LARGO ? .28 : .065) * u) + .0042 * Math.sin(u * 7.5 + i); y = y0 + (yEnd - drop - y0) * u; z = zS + (zE - zS) * Math.min(1, u * 1.6); }
    pts.push(V([x, y, z])); }
  strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .0046, 4, false)); }
let merged = null; try { merged = THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries(strands); } catch (e) { merged = null; }
if (merged) mesh(merged, hairM, G.body).renderOrder = 4; else strands.forEach(g => mesh(g, hairM, G.body).renderOrder = 4);

FX.heart.a = halo(0xff4d73, .58, heart); FX.brain.a = halo(0xffd1dc, .44, brain);
} catch (err) { console.warn('Capa Cuerpo no disponible:', err); }

/* ---------- interacción y modales ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), on = { body: true, bone: true, nerv: true, vasc: true };
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

const sync = () => { for (const s in ROOT) ROOT[s].visible = on[s]; const o = on.nerv || on.vasc, ex = on.bone || on.nerv || on.vasc;
  boneM.transparent = o; boneM.opacity = o ? .42 : 1; boneM.depthWrite = !o; boneM.needsUpdate = true;
  hairM.transparent = ex; hairM.opacity = ex ? .52 : 1; hairM.depthWrite = !ex; hairM.needsUpdate = true; skinU.t = ex ? .12 : .82; };
document.querySelectorAll('#chips button').forEach(b => b.onclick = () => { const s = b.dataset.s; on[s] = !on[s]; b.setAttribute('aria-pressed', on[s]); sync(); });
sync();

/* ---------- barra de mensajes → Discord + corazones flotantes ---------- */
const form = document.getElementById('msgbar'), input = document.getElementById('msg'), send = document.getElementById('send'), st = document.getElementById('status'), hearts = document.getElementById('hearts');
const floatHearts = () => { for (let i = 0; i < 28; i++) { const s = document.createElement('span'); s.textContent = '♥';
  s.style.cssText = `--x:${6 + Math.random() * 88}%;--s:${14 + Math.random() * 28}px;--c:${['#ff8aa5', '#ffc2d6', '#ff4d73', '#ffe0e9'][i % 4]};--t:${2.8 + Math.random() * 1.8}s;--d:${Math.random() * .7}s;--w:${(Math.random() - .5) * 100}px`;
  hearts.appendChild(s); setTimeout(() => s.remove(), 5000); } };
form.addEventListener('submit', async e => { e.preventDefault(); const text = input.value.trim(); if (!text) return; send.disabled = true; st.className = ''; st.textContent = 'Enviando…';
  try { const r = await fetch('/api/send-to-discord', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    if (!r.ok) throw new Error(r.status); input.value = ''; st.textContent = 'Mensaje enviado con amor'; floatHearts(); setTimeout(() => { if (st.textContent == 'Mensaje enviado con amor') st.textContent = ''; }, 4000);
  } catch (err) { st.className = 'err'; st.textContent = 'No se ha podido enviar. Inténtalo de nuevo.'; } finally { send.disabled = false; } });

/* ---------- bucle de renderizado optimizado ---------- */
const fit = () => { W = stage.clientWidth || 1; H = stage.clientHeight || 1; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
new ResizeObserver(fit).observe(stage); fit();
let ph = 0; const clock = new THREE.Clock();
(function loop() { requestAnimationFrame(loop);
  try {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime; controls.update();
  ph += dt * (1 + .5 * FX.heart.v); const p = ph % 1, b = Math.exp(-(((p - .08) * 16) ** 2)) + .6 * Math.exp(-(((p - .3) * 16) ** 2)); heart.scale.setScalar(1 + .085 * b);
  for (const k in FX) { const f = FX[k], tg = (hover == k || active == k) ? 1 : 0; f.v += (tg - f.v) * Math.min(1, dt * 8); const id = .5 + .5 * Math.sin(t * 1.9 + (k == 'brain' ? 0 : 2));
    f.ms.forEach(m => m.emissiveIntensity = f.base + .06 * id + f.v * .95); f.h.material.opacity = f.v * (.72 + .28 * (k == 'heart' ? b : id)) + .06 * id; if (f.a) f.a.material.opacity = k == 'heart' ? .15 + .17 * b : .11 + .07 * id; }
  pulses.forEach(q => { q.t = (q.t + dt * q.s) % 1; q.m.position.copy(q.c.getPointAt(q.r ? 1 - q.t : q.t)); });
  for (let i = 0; i < N; i++) { pp[i * 3 + 1] += dt * .045; if (pp[i * 3 + 1] > 2.5) pp[i * 3 + 1] = 0; } pgeo.attributes.position.needsUpdate = true;
  skinU.uA.value += (skinU.t - skinU.uA.value) * Math.min(1, dt * 7);
  } catch (err) { if (!loop.warned) { loop.warned = 1; console.warn('Error en el bucle de animación:', err); } }
  renderer.render(scene, camera); })();
})();
