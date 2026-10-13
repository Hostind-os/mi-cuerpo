import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ANATOMY_CONTENT } from './anatomy-content.js';

/**
 * Visor anatómico estilizado. Unidades del mundo = metros; altura del modelo ≈ 1,74 m.
 * Requiere Three.js moderno y un bundler ESM como Vite.
 */
const ROOT_SELECTOR = '#anatomy-viewer, #app';
const HEIGHT_METERS = 1.74;
const LAYERS = {
  skin: { label: 'Cuerpo', description: 'Piel y rasgos exteriores' },
  skeleton: { label: 'Esqueleto', description: 'Estructura ósea' },
  nervous: { label: 'Nervioso', description: 'Cerebro, médula y nervios' },
  circulatory: { label: 'Circulatorio', description: 'Corazón, arterias y venas' },
};

const COLORS = {
  background: 0x07121f,
  skin: 0xc98469,
  skinShadow: 0x794a43,
  hair: 0x241b1b,
  bone: 0xf1dfb8,
  nerve: 0xf9e8b8,
  artery: 0xf0525b,
  vein: 0x4b9dff,
  heart: 0xc9364e,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const sphereGeometryCache = new Map();

function makeRimSkinMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: COLORS.skin,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  });
  // Rim lighting sutil añadido al material estándar; no requiere un segundo mesh.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float anatomyRim = 1.0 - max(dot(normalize(normal), normalize(-vViewPosition)), 0.0);
       anatomyRim = pow(clamp(anatomyRim, 0.0, 1.0), 2.35);
       totalEmissiveRadiance += vec3(0.018, 0.105, 0.15) * anatomyRim;`
    );
  };
  material.customProgramCacheKey = () => 'anatomy-rim-skin-v1';
  return material;
}

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.02, ...options });
}

function makeTube(curve, radius, material, segments = 28, radialSegments = 7) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function curveThrough(points, closed = false) {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => vec(x, y, z)), closed, 'centripetal');
}

function addEllipsoid(parent, position, scale, material, segments = 20) {
  const widthSegments = segments;
  const heightSegments = Math.max(12, Math.floor(segments * 0.75));
  const geometryKey = `${widthSegments}:${heightSegments}`;
  let geometry = sphereGeometryCache.get(geometryKey);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments);
    sphereGeometryCache.set(geometryKey, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBoneSegment(parent, start, end, radius, material, radiusEnd = radius) {
  const a = vec(...start);
  const b = vec(...end);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusEnd, radius, direction.length(), 10, 1),
    material
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(vec(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTubePath(parent, points, radius, material, segments = 28) {
  const curve = curveThrough(points);
  parent.add(makeTube(curve, radius, material, segments));
  return curve;
}

function buildHair(parent, hairMaterial) {
  addEllipsoid(parent, [0, 1.681, -0.003], [0.106, 0.057, 0.098], hairMaterial, 22);
  const locks = [
    [-0.075, 1.692, 0.002, -0.025], [-0.048, 1.709, 0.01, 0.03],
    [-0.014, 1.698, 0.018, -0.035], [0.021, 1.713, 0.003, 0.045],
    [0.052, 1.695, 0.004, 0.02], [0.078, 1.682, -0.01, -0.04],
    [-0.092, 1.673, -0.005, -0.02], [0.009, 1.684, -0.055, 0.035],
  ];
  for (const [x, y, z, rz] of locks) {
    const lock = addEllipsoid(parent, [x, y, z], [0.027, 0.026, 0.029], hairMaterial, 12);
    lock.rotation.z = rz;
    lock.rotation.x = (x < 0 ? -1 : 1) * 0.17;
  }
}

function buildSkin(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Cuerpo';
  parent.add(group);
  const skin = makeRimSkinMaterial();
  const shadowSkin = createMaterial(COLORS.skinShadow, { roughness: 0.62 });
  const hair = createMaterial(COLORS.hair, { roughness: 0.78 });
  const eyeWhite = createMaterial(0xf4f4ec, { roughness: 0.23 });
  const iris = createMaterial(0x6b9e9c, { roughness: 0.25, metalness: 0.04 });
  const pupil = createMaterial(0x101a20, { roughness: 0.18 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lip = createMaterial(0x914e4b, { roughness: 0.5 });

  // Cabeza, cuello y tronco: volúmenes atléticos proporcionados.
  addEllipsoid(group, [0, 1.575, 0], [0.103, 0.13, 0.094], skin, 28);
  addBoneSegment(group, [0, 1.405, 0], [0, 1.475, 0], 0.047, skin, 0.048);
  addEllipsoid(group, [0, 1.31, 0], [0.205, 0.155, 0.105], skin, 24);
  addEllipsoid(group, [0, 1.205, 0.008], [0.17, 0.145, 0.098], skin, 24);
  addEllipsoid(group, [0, 1.075, 0.008], [0.15, 0.13, 0.088], skin, 24);
  addEllipsoid(group, [0, 0.944, 0], [0.18, 0.105, 0.097], skin, 22);

  // Hombros y brazos ligeramente separados del torso para conservar la silueta.
  for (const side of [-1, 1]) {
    addEllipsoid(group, [side * 0.207, 1.365, 0], [0.074, 0.075, 0.079], skin, 18);
    addBoneSegment(group, [side * 0.22, 1.35, 0], [side * 0.274, 1.18, 0.008], 0.048, skin, 0.055);
    addEllipsoid(group, [side * 0.274, 1.175, 0.008], [0.047, 0.05, 0.047], skin, 16);
    addBoneSegment(group, [side * 0.274, 1.16, 0.008], [side * 0.294, 0.965, 0.015], 0.034, skin, 0.043);
    addEllipsoid(group, [side * 0.295, 0.93, 0.023], [0.039, 0.064, 0.027], skin, 16);
    // Dedos simplificados.
    for (let finger = -1; finger <= 1; finger++) {
      addBoneSegment(group,
        [side * 0.295 + finger * 0.014, 0.91, 0.026],
        [side * 0.295 + finger * 0.018, 0.875 + (1 - Math.abs(finger)) * 0.006, 0.028],
        0.0065, skin, 0.0055);
    }
    // Piernas y pies.
    addEllipsoid(group, [side * 0.105, 0.855, 0], [0.074, 0.12, 0.082], skin, 18);
    addBoneSegment(group, [side * 0.105, 0.86, 0], [side * 0.132, 0.515, 0.006], 0.061, skin, 0.073);
    addEllipsoid(group, [side * 0.132, 0.5, 0.006], [0.047, 0.05, 0.05], skin, 16);
    addBoneSegment(group, [side * 0.132, 0.49, 0.006], [side * 0.135, 0.135, 0.008], 0.039, skin, 0.048);
    addEllipsoid(group, [side * 0.135, 0.038, 0.045], [0.055, 0.038, 0.095], skin, 18);
  }

  // Orejas, rasgos faciales y ojos brillantes con reflejo doble.
  for (const side of [-1, 1]) {
    addEllipsoid(group, [side * 0.101, 1.575, -0.002], [0.018, 0.033, 0.022], skin, 12);
    addEllipsoid(group, [side * 0.038, 1.602, 0.084], [0.024, 0.016, 0.012], shadowSkin, 14);
    addEllipsoid(group, [side * 0.038, 1.601, 0.09], [0.019, 0.011, 0.009], eyeWhite, 14);
    addEllipsoid(group, [side * 0.036, 1.602, 0.098], [0.008, 0.009, 0.0045], iris, 12);
    addEllipsoid(group, [side * 0.036, 1.602, 0.101], [0.0041, 0.006, 0.0025], pupil, 10);
    addEllipsoid(group, [side * 0.033, 1.606, 0.103], [0.0025, 0.0028, 0.0015], shine, 8);
    addEllipsoid(group, [side * 0.039, 1.622, 0.084], [0.025, 0.006, 0.009], hair, 12).rotation.z = side * 0.08;
  }
  addEllipsoid(group, [0, 1.572, 0.094], [0.015, 0.029, 0.019], skin, 12);
  addEllipsoid(group, [0, 1.535, 0.084], [0.027, 0.007, 0.009], lip, 12);
  buildHair(group, hair);
  group.userData.layerKey = 'skin';
  return group;
}

function buildSkeleton(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Esqueleto';
  parent.add(group);
  const bone = createMaterial(COLORS.bone, { roughness: 0.31, metalness: 0.06 });
  const joint = createMaterial(0xe6d2a5, { roughness: 0.38 });

  // Cráneo sugerido mediante arcos, de modo que el encéfalo se vea al activar ambas capas.
  const skullCurves = [
    [[-0.083, 1.58, 0.018], [-0.08, 1.64, 0.025], [-0.045, 1.687, 0.025], [0, 1.696, 0.025], [0.045, 1.687, 0.025], [0.08, 1.64, 0.025], [0.083, 1.58, 0.018]],
    [[-0.075, 1.579, 0.041], [-0.052, 1.535, 0.045], [0, 1.521, 0.044], [0.052, 1.535, 0.045], [0.075, 1.579, 0.041]],
    [[-0.06, 1.62, 0.07], [-0.04, 1.629, 0.08], [0, 1.625, 0.086], [0.04, 1.629, 0.08], [0.06, 1.62, 0.07]],
  ];
  skullCurves.forEach(points => group.add(makeTube(curveThrough(points), 0.006, bone, 22, 7)));
  addBoneSegment(group, [0, 1.51, 0.008], [0, 1.405, 0.008], 0.014, bone, 0.014);
  // Clavículas, esternón y costillas.
  addTubePath(group, [[0, 1.39, 0.066], [-0.07, 1.397, 0.063], [-0.15, 1.37, 0.045], [-0.205, 1.36, 0.015]], 0.009, bone, 22);
  addTubePath(group, [[0, 1.39, 0.066], [0.07, 1.397, 0.063], [0.15, 1.37, 0.045], [0.205, 1.36, 0.015]], 0.009, bone, 22);
  addBoneSegment(group, [0, 1.36, 0.078], [0, 1.14, 0.09], 0.012, bone, 0.014);
  for (let i = 0; i < 6; i++) {
    const y = 1.345 - i * 0.031;
    const width = 0.115 + 0.024 * Math.sin((i / 5) * Math.PI);
    const z = 0.035 - i * 0.002;
    const points = [[0, y, 0.084], [-width * 0.62, y - 0.016, z + 0.04], [-width, y - 0.035, z], [-width * 0.78, y - 0.051, z - 0.012]];
    group.add(makeTube(curveThrough(points), 0.0068, bone, 18, 6));
    group.add(makeTube(curveThrough(points.map(([x, py, pz]) => [-x, py, pz])), 0.0068, bone, 18, 6));
  }
  // Pelvis como dos alas curvas.
  addTubePath(group, [[0, 1.015, 0.02], [-0.065, 1.03, 0.035], [-0.135, 0.985, 0.04], [-0.145, 0.934, 0.035], [-0.09, 0.91, 0.046], [0, 0.925, 0.055]], 0.011, bone, 22);
  addTubePath(group, [[0, 1.015, 0.02], [0.065, 1.03, 0.035], [0.135, 0.985, 0.04], [0.145, 0.934, 0.035], [0.09, 0.91, 0.046], [0, 0.925, 0.055]], 0.011, bone, 22);
  // Vértebras visibles a lo largo del eje central.
  for (let i = 0; i < 13; i++) {
    const y = 1.42 - i * 0.038;
    if (y < 0.96) break;
    addEllipsoid(group, [0, y, -0.002], [0.019, 0.012, 0.018], joint, 10);
    addBoneSegment(group, [0, y, 0.001], [0, y - 0.006, -0.035], 0.0045, bone, 0.0035);
  }
  // Brazos: húmero, radio/cúbito, manos; piernas: fémur, tibia/peroné.
  for (const s of [-1, 1]) {
    addEllipsoid(group, [s * 0.205, 1.36, 0], [0.025, 0.025, 0.024], joint, 12);
    addBoneSegment(group, [s * 0.21, 1.35, 0], [s * 0.273, 1.18, 0.006], 0.016, bone, 0.019);
    addEllipsoid(group, [s * 0.273, 1.174, 0.006], [0.018, 0.017, 0.018], joint, 10);
    addBoneSegment(group, [s * 0.274, 1.16, 0.009], [s * 0.294, 0.97, 0.015], 0.008, bone, 0.011);
    addBoneSegment(group, [s * 0.286, 1.16, -0.004], [s * 0.306, 0.97, 0.005], 0.006, bone, 0.008);
    for (let f = -1; f <= 1; f++) {
      addBoneSegment(group, [s * 0.295 + f * 0.009, 0.958, 0.018], [s * 0.296 + f * 0.013, 0.905, 0.023], 0.0038, bone, 0.0027);
    }
    addEllipsoid(group, [s * 0.105, 0.85, 0], [0.025, 0.027, 0.025], joint, 12);
    addBoneSegment(group, [s * 0.105, 0.85, 0], [s * 0.132, 0.515, 0.006], 0.023, bone, 0.025);
    addEllipsoid(group, [s * 0.132, 0.5, 0.006], [0.018, 0.018, 0.018], joint, 10);
    addBoneSegment(group, [s * 0.132, 0.49, 0.006], [s * 0.135, 0.14, 0.008], 0.011, bone, 0.014);
    addBoneSegment(group, [s * 0.145, 0.485, -0.002], [s * 0.148, 0.145, 0.001], 0.006, bone, 0.008);
    for (let toe = -1; toe <= 1; toe++) {
      addBoneSegment(group, [s * 0.135 + toe * 0.012, 0.105, 0.025], [s * 0.135 + toe * 0.015, 0.055, 0.1], 0.0045, bone, 0.003);
    }
  }
  group.userData.layerKey = 'skeleton';
  return group;
}

function buildNervous(parent, pulseMaterial) {
  const group = new THREE.Group();
  group.name = 'Capa · Sistema nervioso';
  parent.add(group);
  const nerve = createMaterial(COLORS.nerve, { color: COLORS.nerve, emissive: 0xd9b967, emissiveIntensity: 0.4, roughness: 0.3 });
  const fineNerve = createMaterial(0xeed89e, { emissive: 0xa88443, emissiveIntensity: 0.24, roughness: 0.4 });

  // Encéfalo con dos hemisferios y surcos sinuosos.
  addEllipsoid(group, [-0.036, 1.615, 0.012], [0.052, 0.069, 0.061], nerve, 24);
  addEllipsoid(group, [0.036, 1.615, 0.012], [0.052, 0.069, 0.061], nerve, 24);
  const gyri = [
    [[-0.074, 1.636, 0.043], [-0.056, 1.649, 0.062], [-0.032, 1.642, 0.068], [-0.025, 1.625, 0.07]],
    [[-0.078, 1.61, 0.044], [-0.057, 1.62, 0.067], [-0.04, 1.608, 0.073], [-0.044, 1.59, 0.061]],
    [[-0.058, 1.578, 0.03], [-0.04, 1.59, 0.067], [-0.019, 1.577, 0.064]],
    [[0.074, 1.636, 0.043], [0.056, 1.649, 0.062], [0.032, 1.642, 0.068], [0.025, 1.625, 0.07]],
    [[0.078, 1.61, 0.044], [0.057, 1.62, 0.067], [0.04, 1.608, 0.073], [0.044, 1.59, 0.061]],
    [[0.058, 1.578, 0.03], [0.04, 1.59, 0.067], [0.019, 1.577, 0.064]],
  ];
  gyri.forEach(points => group.add(makeTube(curveThrough(points), 0.0031, fineNerve, 18, 5)));
  // Tallo, médula y nervios periféricos ramificados.
  const paths = [];
  paths.push(addTubePath(group, [[0, 1.565, 0.025], [0.008, 1.52, 0.028], [0, 1.455, 0.025], [0, 1.36, 0.024], [0, 1.23, 0.027], [0, 1.09, 0.024], [0, 0.98, 0.022]], 0.0085, nerve, 40));
  for (const s of [-1, 1]) {
    paths.push(addTubePath(group, [[s * 0.004, 1.39, 0.025], [s * 0.075, 1.375, 0.035], [s * 0.16, 1.335, 0.04], [s * 0.22, 1.29, 0.04], [s * 0.277, 1.17, 0.035], [s * 0.296, 1.02, 0.032]], 0.0047, fineNerve, 30));
    paths.push(addTubePath(group, [[s * 0.01, 1.21, 0.026], [s * 0.08, 1.16, 0.047], [s * 0.12, 1.08, 0.047], [s * 0.14, 0.96, 0.035], [s * 0.14, 0.82, 0.025], [s * 0.145, 0.67, 0.028], [s * 0.14, 0.49, 0.026], [s * 0.14, 0.3, 0.025]], 0.0044, fineNerve, 34));
    paths.push(addTubePath(group, [[s * 0.035, 1.48, 0.02], [s * 0.07, 1.53, 0.028], [s * 0.083, 1.575, 0.032], [s * 0.073, 1.61, 0.042]], 0.003, fineNerve, 20));
    // Ramificaciones secundarias de extremidades.
    paths.push(addTubePath(group, [[s * 0.14, 0.77, 0.025], [s * 0.11, 0.7, 0.04], [s * 0.115, 0.62, 0.04], [s * 0.13, 0.53, 0.034]], 0.0024, fineNerve, 18));
    paths.push(addTubePath(group, [[s * 0.296, 1.02, 0.032], [s * 0.28, 0.98, 0.04], [s * 0.28, 0.93, 0.04]], 0.0026, fineNerve, 15));
  }
  group.userData.layerKey = 'nervous';
  group.userData.pulsePaths = paths;
  group.userData.pulseMaterial = pulseMaterial;
  return group;
}

function makeHeartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.072);
  shape.bezierCurveTo(-0.025, -0.05, -0.105, 0.005, -0.105, 0.047);
  shape.bezierCurveTo(-0.105, 0.096, -0.047, 0.112, -0.014, 0.076);
  shape.bezierCurveTo(-0.006, 0.066, 0, 0.061, 0, 0.061);
  shape.bezierCurveTo(0, 0.061, 0.006, 0.066, 0.014, 0.076);
  shape.bezierCurveTo(0.047, 0.112, 0.105, 0.096, 0.105, 0.047);
  shape.bezierCurveTo(0.105, 0.005, 0.025, -0.05, 0, -0.072);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.008, bevelThickness: 0.008, curveSegments: 14,
  });
  geometry.center();
  return geometry;
}

function buildCirculatory(parent) {
  const group = new THREE.Group();
  group.name = 'Capa · Sistema circulatorio';
  parent.add(group);
  const artery = createMaterial(COLORS.artery, { emissive: 0x71121d, emissiveIntensity: 0.34, roughness: 0.3 });
  const vein = createMaterial(COLORS.vein, { emissive: 0x102e72, emissiveIntensity: 0.38, roughness: 0.32 });
  const heartMaterial = createMaterial(COLORS.heart, { emissive: 0x671120, emissiveIntensity: 0.32, roughness: 0.27, metalness: 0.04 });
  const arteryCurves = [];
  const veinCurves = [];
  const heartGroup = new THREE.Group();
  heartGroup.name = 'Corazón';
  heartGroup.position.set(0.039, 1.215, 0.115);
  const heartMesh = new THREE.Mesh(makeHeartGeometry(), heartMaterial);
  heartMesh.rotation.z = -0.1;
  heartMesh.rotation.y = 0.08;
  heartMesh.castShadow = true;
  heartGroup.add(heartMesh);
  // Aorta y vasos principales nacen del corazón.
  addTubePath(heartGroup, [[-0.025, 0.057, 0.01], [-0.035, 0.105, 0.015], [-0.025, 0.132, 0.015], [0.006, 0.14, 0.01]], 0.009, artery, 20);
  addTubePath(heartGroup, [[0.028, 0.049, 0.008], [0.049, 0.086, 0.01], [0.043, 0.12, 0.012]], 0.007, vein, 18);
  group.add(heartGroup);

  arteryCurves.push(addTubePath(group, [[0.025, 1.31, 0.06], [0.025, 1.38, 0.055], [0.005, 1.45, 0.045], [0.005, 1.53, 0.055], [0, 1.59, 0.06]], 0.006, artery, 36));
  veinCurves.push(addTubePath(group, [[0.055, 1.30, 0.04], [0.07, 1.37, 0.045], [0.045, 1.45, 0.045], [0.036, 1.52, 0.05]], 0.0046, vein, 30));
  for (const s of [-1, 1]) {
    arteryCurves.push(addTubePath(group, [[0.01, 1.35, 0.055], [s * 0.09, 1.38, 0.055], [s * 0.18, 1.36, 0.045], [s * 0.22, 1.31, 0.04], [s * 0.255, 1.23, 0.04], [s * 0.285, 1.11, 0.04], [s * 0.29, 0.99, 0.035]], 0.005, artery, 34));
    veinCurves.push(addTubePath(group, [[s * 0.045, 1.27, 0.025], [s * 0.12, 1.31, 0.03], [s * 0.2, 1.29, 0.036], [s * 0.27, 1.16, 0.038], [s * 0.28, 1.0, 0.034]], 0.0043, vein, 34));
    arteryCurves.push(addTubePath(group, [[0, 1.12, 0.055], [s * 0.06, 1.06, 0.06], [s * 0.08, 0.98, 0.06], [s * 0.105, 0.87, 0.055], [s * 0.12, 0.75, 0.045], [s * 0.13, 0.58, 0.045], [s * 0.135, 0.36, 0.04], [s * 0.135, 0.16, 0.035]], 0.006, artery, 42));
    veinCurves.push(addTubePath(group, [[s * 0.045, 1.1, 0.035], [s * 0.08, 1.01, 0.04], [s * 0.095, 0.88, 0.042], [s * 0.105, 0.72, 0.04], [s * 0.12, 0.54, 0.038], [s * 0.13, 0.34, 0.035], [s * 0.135, 0.16, 0.03]], 0.0047, vein, 42));
    // Ramificaciones finas en antebrazo y pierna.
    arteryCurves.push(addTubePath(group, [[s * 0.29, 1.03, 0.04], [s * 0.27, 0.99, 0.045], [s * 0.27, 0.95, 0.045]], 0.0027, artery, 14));
    veinCurves.push(addTubePath(group, [[s * 0.13, 0.55, 0.044], [s * 0.105, 0.48, 0.045], [s * 0.113, 0.42, 0.043]], 0.0028, vein, 14));
  }
  arteryCurves.push(addTubePath(group, [[0.02, 1.11, 0.065], [0.035, 1.02, 0.064], [0, 0.96, 0.067], [-0.045, 0.9, 0.06]], 0.006, artery, 22));
  veinCurves.push(addTubePath(group, [[-0.02, 1.1, 0.05], [-0.035, 1.02, 0.055], [0, 0.965, 0.06], [0.04, 0.91, 0.052]], 0.0048, vein, 22));
  group.userData.layerKey = 'circulatory';
  group.userData.heart = heartGroup;
  group.userData.arteryCurves = arteryCurves;
  group.userData.veinCurves = veinCurves;
  return group;
}

function addHotspot(parent, name, position, radius) {
  const material = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, colorWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material);
  mesh.name = `${name} hotspot`;
  mesh.position.set(...position);
  mesh.userData.modalKey = name;
  parent.add(mesh);
  return mesh;
}

function createAppShell(root) {
  root.classList.add('anatomy-app');
  root.innerHTML = `
    <header class="anatomy-header">
      <div class="anatomy-brand">
        <span class="anatomy-brand__mark" aria-hidden="true">✳</span>
        <div><p class="anatomy-eyebrow">EXPLORADOR INTERACTIVO</p><h1>Anatomía <span>3D</span></h1></div>
      </div>
      <div class="anatomy-measure"><span class="anatomy-live-dot"></span><span>Modelo proporcional · <strong>1,74 m</strong> · 73 kg</span></div>
    </header>
    <main class="anatomy-main">
      <section class="anatomy-view" aria-label="Visor anatómico interactivo">
        <div class="anatomy-canvas-host"></div>
        <div class="anatomy-view__topline"><span class="anatomy-chip"><span class="anatomy-chip__dot"></span> VISTA 3D EN VIVO</span><span class="anatomy-gesture-hint">Arrastra para girar · rueda para acercar</span></div>
        <div class="anatomy-view__bottomline"><span class="anatomy-coordinate">EJE Y · 1,74 M</span><span class="anatomy-rotate-indicator"><span class="anatomy-rotate-icon">↻</span> Vista orbital</span></div>
        <div class="anatomy-webgl-error" hidden>Tu navegador no ha podido iniciar WebGL. Prueba a actualizar el navegador o activar la aceleración por hardware.</div>
      </section>
      <aside class="anatomy-panel" aria-label="Capas y acciones del visor">
        <div class="anatomy-panel__heading"><div><p class="anatomy-eyebrow">CAPAS DEL MODELO</p><h2>Explora el cuerpo</h2></div><span class="anatomy-panel__count">04</span></div>
        <p class="anatomy-panel__intro">Activa una o varias capas para explorar las estructuras anatómicas.</p>
        <div class="anatomy-layer-list">
          <button class="anatomy-layer is-active" type="button" data-layer="skin" aria-pressed="true"><span class="anatomy-layer__swatch swatch-skin"></span><span class="anatomy-layer__copy"><strong>Cuerpo</strong><small>Piel y rasgos exteriores</small></span><span class="anatomy-layer__toggle" aria-hidden="true"><span></span></span></button>
          <button class="anatomy-layer" type="button" data-layer="skeleton" aria-pressed="false"><span class="anatomy-layer__swatch swatch-bone"></span><span class="anatomy-layer__copy"><strong>Esqueleto</strong><small>Huesos y articulaciones</small></span><span class="anatomy-layer__toggle" aria-hidden="true"><span></span></span></button>
          <button class="anatomy-layer" type="button" data-layer="nervous" aria-pressed="false"><span class="anatomy-layer__swatch swatch-nerve"></span><span class="anatomy-layer__copy"><strong>Sistema nervioso</strong><small>Cerebro, médula y nervios</small></span><span class="anatomy-layer__toggle" aria-hidden="true"><span></span></span></button>
          <button class="anatomy-layer" type="button" data-layer="circulatory" aria-pressed="false"><span class="anatomy-layer__swatch swatch-blood"></span><span class="anatomy-layer__copy"><strong>Sistema circulatorio</strong><small>Corazón, arterias y venas</small></span><span class="anatomy-layer__toggle" aria-hidden="true"><span></span></span></button>
        </div>
        <div class="anatomy-panel__divider"></div>
        <p class="anatomy-eyebrow">ACCESO RÁPIDO</p>
        <div class="anatomy-quick-actions">
          <button class="anatomy-info-button" type="button" data-open-modal="brain"><span class="anatomy-info-button__icon">◉</span><span><strong>Explorar cerebro</strong><small>Funciones y curiosidades</small></span><span class="anatomy-arrow">↗</span></button>
          <button class="anatomy-info-button" type="button" data-open-modal="heart"><span class="anatomy-info-button__icon anatomy-info-button__icon--heart">♥</span><span><strong>Explorar corazón</strong><small>Latido y circulación</small></span><span class="anatomy-arrow">↗</span></button>
        </div>
        <div class="anatomy-tip"><span class="anatomy-tip__icon">✦</span><p><strong>Consejo</strong><br>Oculta la capa Cuerpo para ver las estructuras internas con más claridad.</p></div>
      </aside>
    </main>
    <footer class="anatomy-footer">
      <div class="anatomy-footer__note"><span class="anatomy-footer__pulse"></span><span>MODELO ANATÓMICO ESTILIZADO · FINES EDUCATIVOS</span></div>
      <form class="anatomy-discord-form">
        <label class="anatomy-discord-label" for="anatomy-message">Enviar mensaje a Discord</label>
        <input id="anatomy-message" name="message" type="text" maxlength="1500" placeholder="Escribe un mensaje…" autocomplete="off" required>
        <button type="submit">Enviar <span aria-hidden="true">↗</span></button>
        <span class="anatomy-discord-status" role="status" aria-live="polite"></span>
      </form>
    </footer>
    <div class="anatomy-modal" hidden role="dialog" aria-modal="true" aria-labelledby="anatomy-modal-title">
      <button class="anatomy-modal__backdrop" type="button" data-close-modal aria-label="Cerrar ventana"></button>
      <article class="anatomy-modal__card">
        <button class="anatomy-modal__close" type="button" data-close-modal aria-label="Cerrar">×</button>
        <div class="anatomy-modal__orb" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="anatomy-eyebrow anatomy-modal__eyebrow">FICHA ANATÓMICA</p>
        <h2 id="anatomy-modal-title">Anatomía</h2>
        <p class="anatomy-modal__subtitle"></p>
        <div class="anatomy-modal__body"></div>
        <div class="anatomy-modal__fact"><span>✦</span><p></p></div>
        <button class="anatomy-modal__done" type="button" data-close-modal>Volver al modelo <span aria-hidden="true">↗</span></button>
      </article>
    </div>
  `;
  return {
    root,
    host: root.querySelector('.anatomy-canvas-host'),
    view: root.querySelector('.anatomy-view'),
    error: root.querySelector('.anatomy-webgl-error'),
    modal: root.querySelector('.anatomy-modal'),
    modalTitle: root.querySelector('#anatomy-modal-title'),
    modalSubtitle: root.querySelector('.anatomy-modal__subtitle'),
    modalBody: root.querySelector('.anatomy-modal__body'),
    modalFact: root.querySelector('.anatomy-modal__fact p'),
    discordForm: root.querySelector('.anatomy-discord-form'),
    discordInput: root.querySelector('#anatomy-message'),
    discordStatus: root.querySelector('.anatomy-discord-status'),
  };
}

function fillModal(ui, key) {
  const content = ANATOMY_CONTENT[key];
  if (!content) return;
  ui.modalTitle.textContent = content.title;
  ui.modalSubtitle.textContent = content.subtitle;
  ui.modalBody.replaceChildren();
  content.paragraphs.forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = paragraph;
    ui.modalBody.appendChild(p);
  });
  ui.modalFact.textContent = content.fact;
  ui.modal.hidden = false;
  document.body.classList.add('anatomy-modal-open');
  ui.modal.querySelector('.anatomy-modal__close')?.focus({ preventScroll: true });
}

function closeModal(ui) {
  ui.modal.hidden = true;
  document.body.classList.remove('anatomy-modal-open');
}

function createParticles(scene, curves, material, count, radius, phaseOffset = 0) {
  if (!curves?.length) return [];
  const geometry = new THREE.SphereGeometry(radius, 7, 6);
  const particles = [];
  for (let i = 0; i < count; i++) {
    const curveIndex = i % curves.length;
    const curve = curves[curveIndex];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    particles.push({ mesh, curve, offset: ((i / count) + phaseOffset) % 1, speed: 0.045 + (i % 5) * 0.009 });
  }
  return particles;
}

function animateParticles(particles, elapsed) {
  for (const particle of particles) {
    const t = (particle.offset + elapsed * particle.speed) % 1;
    particle.mesh.position.copy(particle.curve.getPointAt(t));
  }
}

function showWebGLError(ui, error) {
  ui.error.hidden = false;
  ui.error.textContent = 'No se ha podido iniciar el visor 3D en este navegador. Comprueba que WebGL y la aceleración por hardware estén disponibles.';
  // El detalle va a consola para facilitar el diagnóstico sin mostrar datos técnicos al visitante.
  console.error('[AnatomyViewer] No se pudo inicializar WebGL:', error);
}

function initDiscordForm(ui) {
  ui.discordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = ui.discordInput.value.trim();
    if (!message) return;
    const submitButton = ui.discordForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    ui.discordStatus.textContent = 'Enviando…';
    ui.discordStatus.dataset.state = 'pending';
    try {
      const response = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source: 'Visor anatómico 3D' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
      ui.discordInput.value = '';
      ui.discordStatus.textContent = 'Mensaje enviado';
      ui.discordStatus.dataset.state = 'success';
    } catch (error) {
      ui.discordStatus.textContent = error.message === 'Failed to fetch'
        ? 'No se pudo conectar con /api/discord.'
        : (error.message || 'No se pudo enviar el mensaje.');
      ui.discordStatus.dataset.state = 'error';
      console.error('[AnatomyViewer] Falló el envío a Discord:', error);
    } finally {
      submitButton.disabled = false;
    }
  });
}

function initViewer(ui) {
  // El formulario de Discord debe seguir disponible aunque el navegador no soporte WebGL.
  initDiscordForm(ui);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    showWebGLError(ui, error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(ui.host.clientWidth || 800, ui.host.clientHeight || 600, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.className = 'anatomy-canvas';
  renderer.domElement.setAttribute('aria-label', 'Modelo anatómico 3D. Arrastra para girar y haz clic sobre el cerebro o el corazón para abrir su ficha.');
  ui.host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  scene.fog = new THREE.Fog(COLORS.background, 3.8, 8.5);

  const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 30);
  camera.position.set(0.1, 1.03, 3.65);
  camera.lookAt(0, 0.91, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.92, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 2.15;
  controls.maxDistance = 5.8;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xbad8f7, 0x211729, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffe4cc, 3.0);
  keyLight.position.set(-2.5, 3.5, 4.2);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x45bbf2, 3.1);
  rimLight.position.set(2.8, 2.1, -2.2);
  scene.add(rimLight);
  const frontLight = new THREE.PointLight(0x729dff, 0.8, 6);
  frontLight.position.set(0, 1.25, 2.0);
  scene.add(frontLight);

  // Halo de suelo discreto para dar escala, sin cargar recursos externos.
  const floorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.0018, 4, 96),
    new THREE.MeshBasicMaterial({ color: 0x2b5c76, transparent: true, opacity: 0.55 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.018;
  scene.add(floorRing);
  const floorRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.001, 4, 96),
    new THREE.MeshBasicMaterial({ color: 0x244253, transparent: true, opacity: 0.28 })
  );
  floorRing2.rotation.x = Math.PI / 2;
  floorRing2.position.y = 0.018;
  scene.add(floorRing2);

  const model = new THREE.Group();
  model.name = `Modelo humano (${HEIGHT_METERS.toFixed(2)} m)`;
  scene.add(model);
  const skinGroup = buildSkin(model);
  const skeletonGroup = buildSkeleton(model);
  const pulseMaterial = new THREE.MeshBasicMaterial({ color: COLORS.nerve });
  const nervousGroup = buildNervous(model, pulseMaterial);
  const circulatoryGroup = buildCirculatory(model);
  skeletonGroup.visible = false;
  nervousGroup.visible = false;
  circulatoryGroup.visible = false;

  // Objetos de selección con material invisible: permanecen disponibles aunque su capa esté oculta.
  const brainHotspot = addHotspot(model, 'brain', [0, 1.615, 0.114], 0.086);
  const heartHotspot = addHotspot(model, 'heart', [0.04, 1.215, 0.164], 0.079);
  const hotspots = [brainHotspot, heartHotspot];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;

  // Pulsos luminosos reutilizan geometría/material; sus posiciones se actualizan en cada fotograma.
  const nervousPulses = createParticles(scene, nervousGroup.userData.pulsePaths, pulseMaterial, 18, 0.006, 0.08);
  const bloodPulses = createParticles(scene, circulatoryGroup.userData.arteryCurves, new THREE.MeshBasicMaterial({ color: 0xff8c8e }), 16, 0.0052, 0.31);
  const venousPulses = createParticles(scene, circulatoryGroup.userData.veinCurves, new THREE.MeshBasicMaterial({ color: 0x9bc8ff }), 12, 0.0045, 0.57);
  nervousPulses.forEach(({ mesh }) => { mesh.visible = nervousGroup.visible; });
  [...bloodPulses, ...venousPulses].forEach(({ mesh }) => { mesh.visible = circulatoryGroup.visible; });

  const layerGroups = { skin: skinGroup, skeleton: skeletonGroup, nervous: nervousGroup, circulatory: circulatoryGroup };
  ui.root.querySelectorAll('[data-layer]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.layer;
      const group = layerGroups[key];
      if (!group) return;
      group.visible = !group.visible;
      if (key === 'nervous') nervousPulses.forEach(({ mesh }) => { mesh.visible = group.visible; });
      if (key === 'circulatory') [...bloodPulses, ...venousPulses].forEach(({ mesh }) => { mesh.visible = group.visible; });
      button.classList.toggle('is-active', group.visible);
      button.setAttribute('aria-pressed', String(group.visible));
    });
  });

  ui.root.querySelectorAll('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => fillModal(ui, button.dataset.openModal));
  });
  ui.modal.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(ui));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ui.modal.hidden) closeModal(ui);
  });

  renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hotspots, false);
    renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
      pointerStart = null;
      return;
    }
    pointerStart = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(hotspots, false);
    if (hit?.object.userData.modalKey) fillModal(ui, hit.object.userData.modalKey);
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    renderer.domElement.style.cursor = 'grab';
  });

  const clock = new THREE.Clock();
  const resize = () => {
    const width = Math.max(1, ui.host.clientWidth);
    const height = Math.max(1, ui.host.clientHeight);
    camera.aspect = width / height;
    camera.fov = width < 540 ? 38 : 33;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(ui.host);
  window.addEventListener('resize', resize, { passive: true });
  resize();

  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    const elapsed = clock.getElapsedTime();
    controls.update();
    // Latido suave tipo sístole/diástole, sin deformaciones bruscas.
    const beat = 1 + Math.pow((Math.sin(elapsed * Math.PI * 1.55) + 1) * 0.5, 8) * 0.045;
    circulatoryGroup.userData.heart.scale.setScalar(beat);
    animateParticles(nervousPulses, elapsed);
    animateParticles(bloodPulses, elapsed * 1.7);
    animateParticles(venousPulses, elapsed * 1.15);
    // Movimiento casi imperceptible de respiración en la capa exterior.
    skinGroup.scale.y = 1 + Math.sin(elapsed * 1.25) * 0.0017;
    renderer.render(scene, camera);
  });

  // Accesibilidad: detener el bucle al abandonar la página y liberar recursos al descargar.
  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    scene.traverse((object) => {
      if (object.geometry && !disposedGeometries.has(object.geometry)) {
        disposedGeometries.add(object.geometry);
        object.geometry.dispose();
      }
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!disposedMaterials.has(material)) {
            disposedMaterials.add(material);
            material.dispose();
          }
        });
      }
    });
    renderer.dispose();
  }, { once: true });
}

function boot() {
  const host = document.querySelector(ROOT_SELECTOR) || document.body;
  const root = host === document.body ? document.createElement('div') : host;
  if (host === document.body) document.body.appendChild(root);
  const ui = createAppShell(root);
  initViewer(ui);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
