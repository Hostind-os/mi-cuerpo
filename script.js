import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Visor anatómico masculino avanzado y realista.
 * Proporciones: 1,74 m de altura · Estructura masculina atlética.
 */
const ROOT_SELECTOR = '#anatomy-viewer, #app';
const HEIGHT_METERS = 1.74;

const COLORS = {
  background: 0x050b14,
  skin: 0xc88a6d,
  skinShadow: 0x6e433a,
  hair: 0x1c1412,
  bone: 0xf3e5c8,
  nerve: 0xfde3a7,
  artery: 0xe63946,
  vein: 0x3a86ff,
  heart: 0xd92b42,
};

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const sphereGeometryCache = new Map();

// Material de piel con sombreado de contorno (Rim Lighting) perfeccionado para anatomía masculina
function makeMasculineSkinMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: COLORS.skin,
    roughness: 0.42,
    metalness: 0.03,
    clearcoat: 0.18,
    clearcoatRoughness: 0.4,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rim = 1.0 - max(dot(normalize(normal), normalize(-vViewPosition)), 0.0);
       rim = pow(clamp(rim, 0.0, 1.0), 2.5);
       totalEmissiveRadiance += vec3(0.02, 0.09, 0.14) * rim;`
    );
  };
  return material;
}

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...options });
}

function makeTube(curve, radius, material, segments = 32, radialSegments = 8) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  return new THREE.Mesh(geometry, material);
}

function curveThrough(points, closed = false) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => vec(x, y, z)), closed, 'centripetal');
}

function addEllipsoid(parent, position, scale, material, segments = 24) {
  const key = `${segments}:${Math.floor(segments * 0.75)}`;
  let geometry = sphereGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(1, segments, Math.floor(segments * 0.75));
    sphereGeometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function addBoneSegment(parent, start, end, radius, material, radiusEnd = radius) {
  const a = vec(...start);
  const b = vec(...end);
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusEnd, radius, dir.length(), 12, 1),
    material
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(vec(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
}

// --- CONSTRUCCIÓN DEL MODELO MASCULINO ---

function buildSkin(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Cuerpo Masculino';
  parent.add(group);

  const skinMat = makeMasculineSkinMaterial();
  const shadowMat = createMaterial(COLORS.skinShadow, { roughness: 0.6 });
  const hairMat = createMaterial(COLORS.hair, { roughness: 0.85 });
  const eyeWhite = createMaterial(0xf8f8f2, { roughness: 0.2 });
  const irisMat = createMaterial(0x315f72, { roughness: 0.25, metalness: 0.1 });
  const pupilMat = createMaterial(0x0a0f14, { roughness: 0.1 });
  const lipMat = createMaterial(0x8a524a, { roughness: 0.5 });

  // Cabeza y cuello masculinos bien definidos
  addEllipsoid(group, [0, 1.58, 0], [0.098, 0.125, 0.102], skinMat, 32);
  addBoneSegment(group, [0, 1.41, 0], [0, 1.48, 0], 0.052, skinMat, 0.055); // Cuello ancho
  
  // Tronco atlético masculino (hombros marcados, pecho amplio y cintura proporcionada)
  addEllipsoid(group, [0, 1.32, 0.005], [0.22, 0.15, 0.11], skinMat, 28); // Pectorales / Hombros
  addEllipsoid(group, [0, 1.20, 0.01], [0.185, 0.14, 0.10], skinMat, 28);  // Caja torácica
  addEllipsoid(group, [0, 1.07, 0.01], [0.155, 0.12, 0.09], skinMat, 26);  // Abdomen
  addEllipsoid(group, [0, 0.94, 0], [0.17, 0.10, 0.095], skinMat, 26);     // Cadera / Pelvis

  // Extremidades superiores (Brazos musculosos)
  for (const s of [-1, 1]) {
    addEllipsoid(group, [s * 0.22, 1.36, 0], [0.08, 0.082, 0.085], skinMat, 20); // Deltoides
    addBoneSegment(group, [s * 0.23, 1.34, 0], [s * 0.28, 1.16, 0.01], 0.052, skinMat, 0.046); // Bíceps/Tríceps
    addEllipsoid(group, [s * 0.28, 1.15, 0.01], [0.05, 0.052, 0.05], skinMat, 18); // Codo
    addBoneSegment(group, [s * 0.28, 1.13, 0.01], [0.3 * s, 0.95, 0.015], 0.038, skinMat, 0.031); // Antebrazo
    addEllipsoid(group, [s * 0.305, 0.91, 0.02], [0.038, 0.065, 0.028], skinMat, 16); // Mano
  }

  // Extremidades inferiores (Piernas fuertes y definidas)
  for (const s of [-1, 1]) {
    addEllipsoid(group, [s * 0.11, 0.84, 0], [0.085, 0.13, 0.095], skinMat, 20); // Muslo superior
    addBoneSegment(group, [s * 0.11, 0.85, 0], [s * 0.135, 0.50, 0.008], 0.07, skinMat, 0.055); // Fémur
    addEllipsoid(group, [s * 0.135, 0.49, 0.008], [0.052, 0.055, 0.052], skinMat, 18); // Rodilla
    addBoneSegment(group, [s * 0.135, 0.47, 0.008], [s * 0.138, 0.13, 0.01], 0.045, skinMat, 0.035); // Pantorrilla
    addEllipsoid(group, [s * 0.14, 0.035, 0.045], [0.058, 0.038, 0.10], skinMat, 20); // Pie
  }

  // Rostro masculino detallado y ojos realistas
  for (const s of [-1, 1]) {
    addEllipsoid(group, [s * 0.105, 1.575, -0.005], [0.018, 0.032, 0.022], skinMat, 14); // Oreja
    addEllipsoid(group, [s * 0.04, 1.602, 0.085], [0.025, 0.017, 0.014], shadowMat, 16); // Órbita ocular
    addEllipsoid(group, [s * 0.04, 1.601, 0.092], [0.02, 0.012, 0.01], eyeWhite, 16);
    addEllipsoid(group, [s * 0.039, 1.602, 0.10], [0.009, 0.009, 0.005], irisMat, 14);
    addEllipsoid(group, [s * 0.039, 1.602, 0.103], [0.0045, 0.0045, 0.0025], pupilMat, 12);
  }
  addEllipsoid(group, [0, 1.57, 0.098], [0.016, 0.032, 0.022], skinMat, 14); // Nariz firme
  addEllipsoid(group, [0, 1.53, 0.088], [0.028, 0.007, 0.01], lipMat, 14);     // Labios

  // Cabello corto y estilizado de chico
  addEllipsoid(group, [0, 1.68, -0.002], [0.102, 0.052, 0.10], hairMat, 26);
  addEllipsoid(group, [0, 1.70, 0.02], [0.08, 0.03, 0.07], hairMat, 20);

  group.userData.layerKey = 'skin';
  return group;
}

function buildSkeleton(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Esqueleto Masculino';
  parent.add(group);

  const boneMat = createMaterial(COLORS.bone, { roughness: 0.28, metalness: 0.08 });
  const jointMat = createMaterial(0xe5d4b3, { roughness: 0.35 });

  // Cráneo anatómicamente proporcionado
  const skullPoints = [
    [[-0.075, 1.59, 0.02], [-0.07, 1.65, 0.03], [0, 1.69, 0.03], [0.07, 1.65, 0.03], [0.075, 1.59, 0.02]],
    [[-0.07, 1.58, 0.045], [0, 1.52, 0.048], [0.07, 1.58, 0.045]]
  ];
  skullPoints.forEach(pts => group.add(makeTube(curveThrough(pts), 0.006, boneMat, 24, 8)));

  // Columna vertebral y caja torácica robusta masculina
  for (let i = 0; i < 13; i++) {
    const y = 1.43 - i * 0.037;
    if (y < 0.95) break;
    addEllipsoid(group, [0, y, -0.003], [0.022, 0.013, 0.02], jointMat, 12);
  }

  // Costillas amplias
  for (let i = 0; i < 6; i++) {
    const y = 1.35 - i * 0.031;
    const w = 0.125 + 0.02 * Math.sin((i / 5) * Math.PI);
    const ribCurve = [[0, y, 0.085], [-w * 0.65, y - 0.015, 0.045], [-w, y - 0.04, 0.005]];
    group.add(makeTube(curveThrough(ribCurve), 0.007, boneMat, 20, 6));
    group.add(makeTube(curveThrough(ribCurve.map(([x, py, pz]) => [-x, py, pz])), 0.007, boneMat, 20, 6));
  }

  // Huesos de extremidades (Húmero, Radio, Fémur, Tibia)
  for (const s of [-1, 1]) {
    addBoneSegment(group, [s * 0.22, 1.35, 0], [s * 0.28, 1.16, 0.01], 0.018, boneMat, 0.02);
    addBoneSegment(group, [s * 0.28, 1.14, 0.01], [s * 0.30, 0.96, 0.015], 0.01, boneMat, 0.013);
    addBoneSegment(group, [s * 0.11, 0.85, 0], [s * 0.135, 0.50, 0.008], 0.026, boneMat, 0.028);
    addBoneSegment(group, [s * 0.135, 0.48, 0.008], [s * 0.138, 0.14, 0.01], 0.014, boneMat, 0.017);
  }

  group.userData.layerKey = 'skeleton';
  return group;
}

function buildNervous(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Sistema Nervioso';
  parent.add(group);

  const nerveMat = createMaterial(COLORS.nerve, { emissive: 0xd9b862, emissiveIntensity: 0.45, roughness: 0.28 });
  const fineMat = createMaterial(0xfef2cc, { emissive: 0xa68334, emissiveIntensity: 0.25 });

  // Cerebro masculino detallado dentro del cráneo
  addEllipsoid(group, [-0.038, 1.615, 0.015], [0.054, 0.07, 0.063], nerveMat, 26);
  addEllipsoid(group, [0.038, 1.615, 0.015], [0.054, 0.07, 0.063], nerveMat, 26);

  // Médula espinal central y conexiones nerviosas principales
  const spinePath = [[0, 1.56, 0.025], [0, 1.25, 0.028], [0, 0.95, 0.025]];
  addTubePath(group, spinePath, 0.009, nerveMat, 40);

  for (const s of [-1, 1]) {
    // Plexo braquial y nervios de brazos
    addTubePath(group, [[s * 0.01, 1.38, 0.025], [s * 0.12, 1.33, 0.035], [s * 0.22, 1.25, 0.04], [s * 0.3, 0.98, 0.03]], 0.0048, fineMat, 30);
    // Nervio ciático y extremidades inferiores
    addTubePath(group, [[s * 0.02, 1.15, 0.02], [s * 0.08, 1.05, 0.045], [s * 0.14, 0.8, 0.035], [s * 0.14, 0.3, 0.028]], 0.0045, fineMat, 34);
  }

  group.userData.layerKey = 'nervous';
  return group;
}

function makeHeartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.075);
  shape.bezierCurveTo(-0.11, 0.005, -0.11, 0.05, -0.015, 0.08);
  shape.bezierCurveTo(0, 0.064, 0, 0.064, 0, 0.064);
  shape.bezierCurveTo(0, 0.064, 0.015, 0.08, 0.015, 0.08);
  shape.bezierCurveTo(0.11, 0.05, 0.11, 0.005, 0, -0.075);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.048, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.009, curveSegments: 16,
  });
  geo.center();
  return geo;
}

function buildCirculatory(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Sistema Circulatorio';
  parent.add(group);

  const arteryMat = createMaterial(COLORS.artery, { emissive: 0x7a111b, emissiveIntensity: 0.38, roughness: 0.28 });
  const veinMat = createMaterial(COLORS.vein, { emissive: 0x12368a, emissiveIntensity: 0.4, roughness: 0.3 });
  const heartMat = createMaterial(COLORS.heart, { emissive: 0x731422, emissiveIntensity: 0.35, metalness: 0.05 });

  const heartMesh = new THREE.Mesh(makeHeartGeometry(), heartMat);
  heartMesh.position.set(0.04, 1.21, 0.12);
  heartMesh.rotation.z = -0.12;
  group.add(heartMesh);

  // Aorta principal y vasos mayores
  addTubePath(group, [[0.04, 1.27, 0.125], [0.03, 1.39, 0.055], [0, 1.58, 0.065]], 0.0095, arteryMat, 24);
  addTubePath(group, [[0.06, 1.27, 0.115], [0.07, 1.38, 0.048], [0.035, 1.52, 0.055]], 0.0075, veinMat, 22);

  for (const s of [-1, 1]) {
    // Red vascular en brazos
    addTubePath(group, [[0.01, 1.34, 0.055], [s * 0.18, 1.35, 0.045], [s * 0.3, 0.98, 0.035]], 0.0052, arteryMat, 32);
    addTubePath(group, [[s * 0.045, 1.26, 0.028], [s * 0.2, 1.28, 0.038], [s * 0.29, 0.99, 0.033]], 0.0045, veinMat, 32);
    // Red vascular en piernas
    addTubePath(group, [[0, 1.11, 0.055], [s * 0.08, 0.97, 0.06], [s * 0.14, 0.15, 0.038]], 0.0062, arteryMat, 40);
    addTubePath(group, [[s * 0.045, 1.09, 0.038], [s * 0.095, 0.88, 0.045], [s * 0.14, 0.15, 0.032]], 0.0048, veinMat, 40);
  }

  group.userData.layerKey = 'circulatory';
  group.userData.heartMesh = heartMesh;
  return group;
}

// --- INICIALIZADOR DEL VISOR 3D ---

function initViewer() {
  const host = document.querySelector(ROOT_SELECTOR);
  if (!host) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth || 800, host.clientHeight || 600);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.Fog(COLORS.background, 3.8, 8.5);

  const camera = new THREE.PerspectiveCamera(33, host.clientWidth / host.clientHeight, 0.05, 30);
  camera.position.set(0.1, 1.03, 3.65);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.92, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.update();

  // Iluminación de estudio profesional
  scene.add(new THREE.HemisphereLight(0xbad8f7, 0x181121, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff0e0, 3.2);
  keyLight.position.set(-2.5, 3.5, 4.2);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x40bbf2, 3.5);
  rimLight.position.set(2.8, 2.1, -2.2);
  scene.add(rimLight);

  // Anillos de suelo estéticos
  const floorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.0018, 4, 96),
    new THREE.MeshBasicMaterial({ color: 0x2b5c76, transparent: true, opacity: 0.6 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.018;
  scene.add(floorRing);

  const model = new THREE.Group();
  scene.add(model);

  const skinGroup = buildSkin(model);
  const skeletonGroup = buildSkeleton(model);
  const nervousGroup = buildNervous(model);
  const circulatoryGroup = buildCirculatory(model);

  // Visibilidad inicial por defecto (Cuerpo encendido, demás apagados)
  skeletonGroup.visible = false;
  nervousGroup.visible = false;
  circulatoryGroup.visible = false;

  const layerGroups = {
    skin: skinGroup,
    skeleton: skeletonGroup,
    nervous: nervousGroup,
    circulatory: circulatoryGroup,
  };

  document.querySelectorAll('.anatomy-app [data-layer]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.layer;
      const group = layerGroups[key];
      if (!group) return;
      group.visible = !group.visible;
      button.classList.toggle('is-active', group.visible);
    });
  });

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    const elapsed = clock.getElapsedTime();
    controls.update();

    // Latido dinámico realista del corazón
    if (circulatoryGroup.visible) {
      const beat = 1 + Math.pow((Math.sin(elapsed * Math.PI * 1.55) + 1) * 0.5, 8) * 0.05;
      circulatoryGroup.userData.heartMesh.scale.setScalar(beat);
    }

    // Sutil ciclo de respiración en la capa de piel
    if (skinGroup.visible) {
      skinGroup.scale.y = 1 + Math.sin(elapsed * 1.25) * 0.0015;
    }

    renderer.render(scene, camera);
  });

  window.addEventListener('resize', () => {
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  }, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initViewer, { once: true });
} else {
  initViewer();
}
