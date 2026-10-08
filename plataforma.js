// Plataforma del juego de señaleros: amplía el hormigón del aeródromo de AURAV, marca el puesto (línea de entrada,
// barra de parada y posición del señalero a 32 m), estaciona 4 AT-802 (versión liviana) y fabrica conos, calzas,
// FOD y el equipo de protección personal (EPP).
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js?v=20261008a';

// --- geometría del puesto (mundo). El avión de la práctica para con las ruedas principales en PUESTO, rumbo −z.
export const PUESTO = new THREE.Vector3(0, 0, -2);
export const NARIZ_X = 2.64;                      // nariz en el marco del avión
export const DIST_SENALERO = 32;                  // posición recomendada del señalero (dato de Iván / AAXOD)
export const POS_SENALERO = new THREE.Vector3(0, 0, PUESTO.z - NARIZ_X - DIST_SENALERO);
// conos del diamante de seguridad (marco del avión: +x nariz, +z derecha). 1 en la nariz, 1 por punta de ala, 2 en la cola.
export const CONOS_DIAMANTE = [[4.1, 0], [-1.5, -10.3], [-1.5, 10.3], [-9.0, -1.3], [-9.0, 1.3]];
const CALZAS = [[0.52, -1.45], [-0.72, -1.45], [0.52, 1.45], [-0.72, 1.45]];

const mat = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...e });

// --- trayectos (origen del avión = ruedas principales). Se arman con tramos rectos y arcos y se muestrean cada 0,25 m.
function trayecto(inicio, rumbo, tramos) {
  // rumbo: ángulo de la dirección de avance en el plano xz (0 = +x). tramos: ['recta', largo] | ['arco', radio, ángulo(+ = izquierda)]
  const pts = [{ p: inicio.clone(), r: rumbo }]; let p = inicio.clone(), r = rumbo;
  for (const t of tramos) {
    if (t[0] === 'recta') { const n = Math.ceil(t[1] / 0.25); for (let i = 1; i <= n; i++) { p = p.clone().add(new THREE.Vector3(Math.cos(r), 0, -Math.sin(r)).multiplyScalar(t[1] / n)); pts.push({ p, r }); } }
    else { const [, R, ang] = t, n = Math.ceil(Math.abs(ang) * R / 0.25); for (let i = 1; i <= n; i++) { const dr = ang / n, l = 2 * R * Math.sin(Math.abs(dr) / 2), rm = r + dr / 2; p = p.clone().add(new THREE.Vector3(Math.cos(rm), 0, -Math.sin(rm)).multiplyScalar(l)); r += dr; pts.push({ p, r }); } }
  }
  const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + pts[i].p.distanceTo(pts[i - 1].p));
  const largo = s[s.length - 1];
  return {
    largo, pts,
    en(d) { d = THREE.MathUtils.clamp(d, 0, largo); let i = 1; while (i < s.length - 1 && s[i] < d) i++; const k = (d - s[i - 1]) / Math.max(1e-6, s[i] - s[i - 1]);
      return { p: pts[i - 1].p.clone().lerp(pts[i].p, k), r: pts[i - 1].r + (pts[i].r - pts[i - 1].r) * k }; },
  };
}
// Llegada: desde la calle de rodaje (rumbo −x), giro a la derecha hacia el puesto (rumbo −z), recta hasta la barra de parada.
export const LLEGADA = trayecto(new THREE.Vector3(26, 0, 15), Math.PI, [['recta', 20], ['arco', 6, -Math.PI / 2], ['recta', 13.5]]);
export const PARADA = 20 + 6 * Math.PI / 2 + 11;   // distancia recorrida hasta la barra de parada (el trayecto sigue 2,5 m más por si se pasa)
// Salida: recta hacia el señalero (rumbo −z), giro a la derecha (rumbo +x, hacia la pista) y rodaje por la plataforma sur.
export const SALIDA = trayecto(PUESTO.clone(), Math.PI / 2, [['recta', 12], ['arco', 6, -Math.PI / 2], ['recta', 30]]);

export function crearPlataforma(escena) {
  const loader = new THREE.TextureLoader();
  const tex = (url, srgb = true) => { const t = loader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const hormigon = mat('#e4e1cf', { map: tex('./tex/hormigon.jpg'), normalMap: tex('./tex/hormigon_n.jpg', false), normalScale: new THREE.Vector2(0.5, 0.5) });
  const asfalto = mat('#9a9c98', { map: tex('./tex/asfalto.jpg'), normalMap: tex('./tex/asfalto_n.jpg', false), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.9 });
  const losa = (w, d, x, y, z, m, tile) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), m); const uv = b.geometry.attributes.uv;
    for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile); b.position.set(x, y, z); b.receiveShadow = true; escena.add(b); return b; };
  losa(39, 24, -1, -0.026, -33, hormigon, 3.2);          // ampliación sur
  losa(32.5, 51, -36.75, -0.027, -19.5, hormigon, 3.2);  // ampliación oeste (estacionamiento)
  losa(5, 11, 20.5, -0.012, -20, asfalto, 7);            // conexión de la plataforma sur con la pista

  // pintura: línea de entrada (amarilla), barra de parada, posición del señalero
  const amarillo = new THREE.MeshBasicMaterial({ color: 0xf2c200 }), blanco = new THREE.MeshBasicMaterial({ color: 0xf2f2ea });
  const linea = (tr, desde, hasta) => { for (let d = desde; d < hasta; d += 0.5) { const a = tr.en(d), b = tr.en(Math.min(hasta, d + 0.5)); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, a.p.distanceTo(b.p) + 0.02), amarillo);
    m.rotation.set(-Math.PI / 2, 0, Math.atan2(b.p.x - a.p.x, -(b.p.z - a.p.z)), 'YXZ'); m.rotation.set(0, 0, 0);
    m.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-(b.p.x - a.p.x), -(b.p.z - a.p.z))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    m.position.copy(a.p).lerp(b.p, 0.5); m.position.y = 0.012; escena.add(m); } };
  linea(LLEGADA, 0, LLEGADA.largo); linea(SALIDA, 0, 33);
  { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.3), amarillo); b.rotation.x = -Math.PI / 2; b.position.set(PUESTO.x, 0.013, PUESTO.z); escena.add(b); }
  // posición del señalero: círculo blanco con la «S»
  { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.strokeStyle = '#f2f2ea'; c.lineWidth = 14; c.beginPath(); c.arc(128, 128, 110, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#f2c200'; c.font = 'bold 120px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('S', 128, 134);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(POS_SENALERO.x, 0.014, POS_SENALERO.z); escena.add(m); }
  // cartel del puesto
  { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d'); c.fillStyle = '#111'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#f2c200'; c.font = 'bold 90px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P3', 128, 68);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: t })); m.rotation.x = -Math.PI / 2; m.position.set(1.8, 0.014, PUESTO.z + 3); escena.add(m); }
}

// 4 AT-802 estacionados (LOD liviano compartido)
export async function estacionarAviones(escena) {
  const gltf = await new GLTFLoader().loadAsync('./at802-lod.glb');
  gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.roughness = 0.45; o.material.side = THREE.DoubleSide; } } });
  const lugares = [[-23, -16], [-43, -16], [-23, -36], [-43, -36]], aviones = [];
  for (const [x, z] of lugares) { const a = gltf.scene.clone(); a.position.set(x, 0, z); a.rotation.y = Math.PI / 2; escena.add(a); aviones.push(a);
    // calzas y conos de diamante en los estacionados
    a.updateMatrixWorld(true);
    for (const [cx, cz] of CONOS_DIAMANTE) { const c = crearCono(); c.position.copy(a.localToWorld(new THREE.Vector3(cx, 0, cz))); escena.add(c); }
    for (const [cx, cz] of CALZAS) { const c = crearCalza(); c.position.copy(a.localToWorld(new THREE.Vector3(cx, 0, cz))); c.rotation.y = a.rotation.y; escena.add(c); } }
  return aviones;
}

export function crearCono() {
  const g = new THREE.Group(); g.name = 'cono';
  const naranja = mat(0xff5a14, { roughness: 0.6 }), refl = mat(0xf4f4f4, { roughness: 0.3, emissive: 0x222222 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.38), mat(0x222222)); base.position.y = 0.015; g.add(base);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 18, 1, true), naranja); c.position.y = 0.38; g.add(c);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.12, 18, 1, true), refl); b.position.y = 0.42; g.add(b);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function crearCalza() {
  const g = new THREE.Group(); g.name = 'calza';
  const sh = new THREE.Shape(); sh.moveTo(-0.13, 0); sh.lineTo(0.13, 0); sh.lineTo(0.05, 0.14); sh.lineTo(-0.05, 0.14); sh.lineTo(-0.13, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: false }); geo.translate(0, 0, -0.21);
  const m = new THREE.Mesh(geo, mat(0xf2c200, { roughness: 0.7 })); m.castShadow = true; g.add(m);
  return g;
}
export { CALZAS };

// FOD: objetos sueltos en la plataforma (algo más grandes que lo real para que se vean en el visor)
export function crearFOD(tipo) {
  const g = new THREE.Group(); g.name = 'fod'; g.userData.tipo = tipo;
  const add = (geo, m, y = 0) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.castShadow = true; g.add(o); return o; };
  if (tipo === 'tornillo') { add(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), mat(0x8a8f94, { metalness: 0.8, roughness: 0.35 }), 0.02).rotation.z = Math.PI / 2; add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 6), mat(0x8a8f94, { metalness: 0.8, roughness: 0.35 }), 0.04).position.x = 0.08; }
  if (tipo === 'trapo') add(new THREE.BoxGeometry(0.34, 0.03, 0.26), mat(0xc0392b, { roughness: 1 }), 0.015).rotation.y = 0.5;
  if (tipo === 'lata') { const o = add(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 14), mat(0xd0d4d8, { metalness: 0.7, roughness: 0.3 }), 0.04); o.rotation.z = Math.PI / 2; }
  if (tipo === 'botella') { const o = add(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), mat(0x9fd3e6, { transparent: true, opacity: 0.75, roughness: 0.2 }), 0.045); o.rotation.z = Math.PI / 2; }
  if (tipo === 'piedra') add(new THREE.DodecahedronGeometry(0.07), mat(0x77706a, { roughness: 1 }), 0.05);
  if (tipo === 'precinto') add(new THREE.TorusGeometry(0.07, 0.008, 6, 20), mat(0x111111), 0.01).rotation.x = Math.PI / 2;
  return g;
}

// EPP: chaleco, protectores auditivos y paletas sobre una mesa de equipo
export function crearEPP() {
  const g = new THREE.Group(); g.name = 'mesa-epp';
  const madera = mat(0x6b5a45), gris = mat(0x3a3f45);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), gris); tapa.position.y = 0.85; g.add(tapa);
  for (const [x, z] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), madera); p.position.set(x, 0.425, z); g.add(p); }
  const items = {};
  { const v = new THREE.Group(); v.name = 'chaleco'; const c = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.38), mat(0xc8e63a, { roughness: 0.6, emissive: 0x1a2200 })); v.add(c);
    for (const z of [-0.08, 0.08]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.035), mat(0xe8e8e8, { emissive: 0x333333, metalness: 0.4, roughness: 0.25 })); b.position.z = z; v.add(b); }
    v.position.set(-0.4, 0.9, 0); g.add(v); items.chaleco = v; }
  { const o = new THREE.Group(); o.name = 'protectores'; const n = mat(0x1d1f22), r = mat(0xd61f26);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16), r); c.position.set(0.09 * s, 0.03, 0); c.rotation.z = Math.PI / 2; o.add(c); }
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16, Math.PI), n); arco.position.y = 0.03; o.add(arco); o.rotation.x = -Math.PI / 2; o.position.set(0.12, 0.9, -0.1); g.add(o); items.protectores = o; }
  { const o = new THREE.Group(); o.name = 'paletas'; for (const s of [-1, 1]) o.add(crearPaleta().translateZ(0.05 * s).rotateZ(Math.PI / 2)); o.position.set(0.45, 0.91, 0.12); g.add(o); items.paletas = o; }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.items = items;
  return g;
}

// paleta luminosa (roja, mango negro); apunta a −y desde la mano
export function crearPaleta() {
  const p = new THREE.Group(); p.name = 'paleta';
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10), mat(0x1d1f22)); mango.position.y = -0.06; p.add(mango);
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.3, 12), mat(0xd61f26, { emissive: 0x5a0000 })); tubo.position.y = -0.27; p.add(tubo);
  const pt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat(0xffe7d0, { emissive: 0x332211 })); pt.position.y = -0.42; p.add(pt);
  return p;
}
