// Señalero de plataforma (AURAV · curso de señaleros AAXOD): figura por código como la de los dibujos del curso
// «Tipos de señales / Curso Personal de Rampa» (AAXOD SA): chaleco amarillo reflectivo, orejeras, casco blanco,
// paletas rojas con punta clara. Mira a +z (hacia el piloto). Su izquierda es +x, su derecha −x.
// Cada brazo se describe con tres direcciones en el marco del cuerpo: brazo, antebrazo y paleta.
import * as THREE from './three.module.js';

const mat = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...e });
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const ABAJO = new THREE.Vector3(0, -1, 0);
const L_BRAZO = 0.30, L_ANTE = 0.27, L_PALETA = 0.42;

// --- Las 12 señas del curso. f(t) devuelve { d: [brazo, ante, paleta], i: [...] } (d = brazo derecho, i = izquierdo)
const lerp = (a, b, k) => new THREE.Vector3().lerpVectors(a, b, k).normalize();
const osc = (t, w = 3) => 0.5 - 0.5 * Math.cos(t * w);      // 0..1..0
const espejo = v => new THREE.Vector3(-v.x, v.y, v.z);
const reposo = s => [V(0.15 * s, -1, 0), V(0.1 * s, -1, 0.2), V(0.05 * s, -1, 0.45)];
const extendido = s => [V(s, 0, 0.05), V(s, 0, 0.05), V(s, 0, 0.05)];
function brazos(der, izq) { return { d: der, i: izq }; }
// «venir hacia adelante» con un brazo (para los giros): brazo afuera, antebrazo que va de afuera a arriba
const venir = (s, t) => { const k = osc(t, 4); return [V(s, 0.15, 0.1), lerp(V(s, 0.1, 0.1), V(0.15 * s, 1, 0), k), lerp(V(s, 0.2, 0.1), V(-0.2 * s, 1, 0.1), k)]; };

export const SENAS = {
  giroDerecha: { nombre: 'Giro a la derecha', f: t => brazos(venir(-1, t), extendido(1)) },
  esperar: { nombre: 'Esperar / mantener posición', f: () => brazos([V(-0.55, -1, 0.1), V(-0.6, -1, 0.1), V(-0.6, -1, 0.15)], [V(0.55, -1, 0.1), V(0.6, -1, 0.1), V(0.6, -1, 0.15)]) },
  todoDespejado: { nombre: 'Todo despejado', f: () => brazos([V(-0.8, -0.35, 0.25), V(-0.05, 1, 0.05), V(0, 1, 0)], reposo(1)) },
  giroIzquierda: { nombre: 'Giro a la izquierda', f: t => brazos(extendido(-1), venir(1, t)) },
  encenderMotores: { nombre: 'Encender motores', f: t => { const a = t * 6; return brazos([V(-0.35, 1, 0.05), V(-0.1, 1, 0), V(0.35 * Math.cos(a), 1, 0.35 * Math.sin(a))], [V(1, -0.15, 0.25), V(1, -0.15, 0.25), V(1, -0.15, 0.25)]); } },
  bajarVelocidad: { nombre: 'Bajar velocidad', f: t => { const k = osc(t, 4); const a = s => [V(s, -0.9, 0.2), lerp(V(s, -0.9, 0.2), V(s, -0.3, 0.2), k), lerp(V(s, -0.8, 0.2), V(s, -0.15, 0.2), k)]; return brazos(a(-1), a(1)); } },
  retroceder: { nombre: 'Retroceder', f: t => { const k = osc(t, 4); const a = s => [V(0.3 * s, -1, 0.15), lerp(V(0.25 * s, -1, 0.1), V(0.25 * s, -0.2, 1), k), lerp(V(0.2 * s, -1, 0.2), V(0.2 * s, 0.4, 1), k)]; return brazos(a(-1), a(1)); } },
  avanzar: { nombre: 'Avanzar', f: t => { const k = osc(t, 4); const a = s => [V(0.9 * s, 0.35, 0.1), lerp(V(0.1 * s, 1, 0.05), V(-0.5 * s, 0.6, 0.3), k), lerp(V(0, 1, 0), V(-0.6 * s, 0.4, 0.4), k)]; return brazos(a(-1), a(1)); } },
  negativo: { nombre: 'Negativo', f: () => brazos([V(-1, -0.45, 0.1), V(-1, -0.45, 0.1), V(-0.1, -1, 0.05)], reposo(1)) },
  paradaEmergencia: { nombre: 'Parada de emergencia', f: t => { const k = Math.min(1, (t * 1.6) % 1.4); const a = s => [lerp(V(s, 0, 0.05), V(0.3 * s, 1, 0.1), k), lerp(V(s, 0, 0.05), V(-0.45 * s, 0.8, 0.15), k), lerp(V(s, 0, 0.05), V(-0.7 * s, 0.7, 0.15), k)]; return brazos(a(-1), a(1)); } },
  detenerMotores: { nombre: 'Detener motores', f: t => { const k = osc(t, 5); return brazos([V(-1, -0.1, 0.45), lerp(V(0.7, 0.05, 0.6), V(1, 0.1, 0.25), k), lerp(V(0.75, 0.05, 0.6), V(1, 0.05, 0.2), k)], reposo(1)); } },
  paradaNormal: { nombre: 'Parada normal', f: t => { const k = osc(t, 1.4); const a = s => [lerp(V(s, 0, 0.05), V(0.3 * s, 1, 0.1), k), lerp(V(s, 0, 0.05), V(-0.45 * s, 0.8, 0.15), k), lerp(V(s, 0, 0.05), V(-0.7 * s, 0.7, 0.15), k)]; return brazos(a(-1), a(1)); } },
};
// Señas de llegada que pidió Iván (8/10) y no están en la lámina del curso → «a validar» con AAXOD:
// saludar al piloto que llega e indicar la posición (brazos extendidos arriba, paletas hacia arriba, como en la seña OACI «identificar puesto»).
SENAS.saludo = { nombre: 'Saludo al piloto (a validar)', extra: true, f: t => { const k = osc(t, 5); return brazos([V(-0.45, 1, 0.1), lerp(V(-0.55, 1, 0.1), V(0.05, 1, 0.1), k), lerp(V(-0.6, 1, 0.1), V(0.1, 1, 0.1), k)], reposo(1)); } };
SENAS.posicion = { nombre: 'Indicar la posición (a validar)', extra: true, f: () => brazos([V(-0.12, 1, 0.05), V(-0.06, 1, 0.05), V(0, 1, 0.02)], [V(0.12, 1, 0.05), V(0.06, 1, 0.05), V(0, 1, 0.02)]) };
// Calzas (Iván con AAXOD, 8/10): no están en la lámina → según OACI, «a validar»: brazos y paletas extendidos sobre la cabeza;
// retirar = las paletas se separan hacia afuera; colocar = se juntan hacia adentro hasta tocarse.
const calzas = haciaAfuera => t => { const k = osc(t, 2.5), a = haciaAfuera ? k : 1 - k; const brazo = s => [lerp(V(0.15 * s, 1, 0.05), V(0.75 * s, 0.8, 0.05), a), lerp(V(-0.05 * s, 1, 0.05), V(0.75 * s, 0.75, 0.05), a), lerp(V(-0.35 * s, 0.9, 0.05), V(0.8 * s, 0.6, 0.05), a)]; return brazos(brazo(-1), brazo(1)); };
SENAS.retirarCalzas = { nombre: 'Retirar calzas (a validar)', extra: true, f: calzas(true) };
SENAS.colocarCalzas = { nombre: 'Colocar calzas (a validar)', extra: true, f: calzas(false) };
// (en la plataforma del juego, el puesto queda a la derecha del rodaje: por eso la llegada gira a la derecha)
// Secuencias base según OACI (referencia aceptada por AAXOD el 8/10/2026). Moldeables: aún no se usan en la operación.
export const SECUENCIA_LLEGADA = ['saludo', 'posicion', 'avanzar', 'giroDerecha', 'avanzar', 'bajarVelocidad', 'paradaNormal', 'colocarCalzas', 'detenerMotores'];
export const SECUENCIA_SALIDA = ['encenderMotores', 'retirarCalzas', 'todoDespejado', 'avanzar', 'giroDerecha', 'avanzar'];
export const ORDEN_CURSO = ['giroDerecha', 'esperar', 'todoDespejado', 'giroIzquierda', 'encenderMotores', 'bajarVelocidad', 'retroceder', 'avanzar', 'negativo', 'paradaEmergencia', 'detenerMotores', 'paradaNormal'];

export function crearSenalero() {
  const g = new THREE.Group(); g.name = 'senalero';
  const piel = mat(0xd9a77f), pantalon = mat(0x2a2d33), chaleco = mat(0xc8e63a, { roughness: 0.6 }), banda = mat(0xe8e8e8, { roughness: 0.25, metalness: 0.4, emissive: 0x333333 }),
    camisa = mat(0x2f5fa8), casco = mat(0xf2f2f0, { roughness: 0.4 }), orejera = mat(0x1d1f22), roja = mat(0xd61f26, { emissive: 0x3a0000 }), punta = mat(0xffe7d0, { emissive: 0x332211 });
  const add = (geo, m, x, y, z, padre = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; padre.add(o); return o; };
  // piernas y botines
  for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.075, 0.065, 0.82, 10), pantalon, 0.1 * s, 0.45, 0); add(new THREE.BoxGeometry(0.12, 0.08, 0.26), orejera, 0.1 * s, 0.04, 0.04); }
  add(new THREE.BoxGeometry(0.36, 0.16, 0.22), pantalon, 0, 0.92, 0);
  // torso con chaleco y bandas reflectivas
  add(new THREE.BoxGeometry(0.4, 0.5, 0.22), camisa, 0, 1.24, 0);
  add(new THREE.BoxGeometry(0.42, 0.46, 0.235), chaleco, 0, 1.22, 0);
  for (const y of [1.07, 1.14]) add(new THREE.BoxGeometry(0.425, 0.035, 0.24), banda, 0, y, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.045, 0.44, 0.24), banda, 0.1 * s, 1.24, 0.001);
  // cabeza, casco y orejeras
  add(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10), piel, 0, 1.51, 0);
  const cabeza = add(new THREE.SphereGeometry(0.105, 16, 12), piel, 0, 1.63, 0); cabeza.scale.set(0.95, 1.08, 1);
  const c = add(new THREE.SphereGeometry(0.118, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), casco, 0, 1.67, 0); c.scale.set(1, 0.85, 1.08);
  add(new THREE.BoxGeometry(0.26, 0.012, 0.06), casco, 0, 1.675, 0.11);
  for (const s of [-1, 1]) { const o = add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14), orejera, 0.115 * s, 1.63, 0); o.rotation.z = Math.PI / 2; }
  add(new THREE.TorusGeometry(0.12, 0.012, 6, 16, Math.PI), orejera, 0, 1.64, 0).rotation.y = Math.PI / 2;
  // brazos: segmentos sueltos que se orientan cada cuadro
  const hombros = { d: new THREE.Vector3(-0.24, 1.43, 0), i: new THREE.Vector3(0.24, 1.43, 0) };
  const seg = (largo, r1, r2, m) => { const o = new THREE.Group(); const cil = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, largo, 10), m); cil.position.y = -largo / 2; cil.castShadow = true; o.add(cil); g.add(o); return o; };
  const brazo = {};
  for (const k of ['d', 'i']) {
    const b = seg(L_BRAZO, 0.055, 0.045, camisa), a = seg(L_ANTE, 0.045, 0.038, camisa), mano = seg(0.08, 0.04, 0.035, piel);
    const p = new THREE.Group(); const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10), orejera); mango.position.y = -0.06; p.add(mango);
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, L_PALETA - 0.12, 12), roja); tubo.position.y = -0.12 - (L_PALETA - 0.12) / 2; p.add(tubo);
    const pt = new THREE.Mesh(new THREE.SphereGeometry(0.027, 10, 8), punta); pt.position.y = -L_PALETA; p.add(pt); g.add(p);
    brazo[k] = { b, a, mano, p };
  }
  const q = new THREE.Quaternion();
  function aplicar(pose) {
    for (const k of ['d', 'i']) {
      const [db, da, dp] = pose[k], br = brazo[k];
      const codo = hombros[k].clone().addScaledVector(db, L_BRAZO), muneca = codo.clone().addScaledVector(da, L_ANTE);
      br.b.position.copy(hombros[k]); br.b.quaternion.copy(q.setFromUnitVectors(ABAJO, db));
      br.a.position.copy(codo); br.a.quaternion.copy(q.setFromUnitVectors(ABAJO, da));
      br.mano.position.copy(muneca); br.mano.quaternion.copy(q.setFromUnitVectors(ABAJO, da));
      br.p.position.copy(muneca).addScaledVector(da, 0.06); br.p.quaternion.copy(q.setFromUnitVectors(ABAJO, dp));
    }
  }
  let actual = null, t = 0;
  g.userData = {
    sena: null,
    hacer(id) { actual = id ? SENAS[id] : null; g.userData.sena = id || null; t = 0; },
    // vel: velocidad de avance en m/s (0 = quieto) para el balanceo de piernas
    caminar(vel) { g.userData.vel = vel; },
    vel: 0,
    actualizar(dt) { t += dt; aplicar(actual ? actual.f(t) : { d: reposo(-1), i: reposo(1) }); },
    pose(id, tt) { aplicar(SENAS[id].f(tt)); },
  };
  g.userData.actualizar(0);
  return g;
}

// --- Señalero con esqueleto (Tripo + auto-rig Mixamo, esqueleto corregido con herramientas/arreglar-rig.mjs).
// Las mismas SENAS mueven los huesos: brazo (Arm→ForeArm), antebrazo (ForeArm→Hand) y mano (Hand→dedo medio);
// la paleta es un objeto aparte que sigue a la mano. El modelo mide 1 m: se escala a `alto`.
export function crearSenaleroGLB(gltf, { alto = 1.75 } = {}) {
  const g = new THREE.Group(); g.name = 'senalero';
  const m = gltf.scene; m.scale.setScalar(alto); g.add(m);
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const hueso = n => { let b = null; m.traverse(o => { if (o.isBone && o.name.replace(/[:]/g, '') === 'mixamorig' + n) b = o; }); return b; };
  const lados = { d: 'Right', i: 'Left' }, cadena = {};
  for (const [k, L] of Object.entries(lados)) cadena[k] = [hueso(L + 'Arm'), hueso(L + 'ForeArm'), hueso(L + 'Hand'), hueso(L + 'HandMiddle1')];
  const piernas = {}; for (const [k, L] of Object.entries(lados)) piernas[k] = [hueso(L + 'UpLeg'), hueso(L + 'Leg'), hueso(L + 'Foot'), hueso(L + 'ToeBase')];
  let paso = 0, caminando = 0;   // caminata simple: balanceo de piernas (0..1 = intensidad)
  const reposoQ = new Map(); m.traverse(o => { if (o.isBone) reposoQ.set(o, o.quaternion.clone()); });
  // paletas
  const roja = mat(0xd61f26, { emissive: 0x3a0000 }), punta = mat(0xffe7d0, { emissive: 0x332211 }), negro = mat(0x1d1f22);
  const paletas = {};
  for (const k of ['d', 'i']) {
    const p = new THREE.Group(); const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10), negro); mango.position.y = -0.06; p.add(mango);
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.3, 12), roja); tubo.position.y = -0.27; p.add(tubo);
    const pt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), punta); pt.position.y = -0.42; p.add(pt); g.add(p); paletas[k] = p;
  }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), qW = new THREE.Quaternion(), qP = new THREE.Quaternion(), qD = new THREE.Quaternion(), qG = new THREE.Quaternion();
  function apuntar(bone, hijo, dirMundo) {
    bone.updateWorldMatrix(true, false); hijo.updateWorldMatrix(true, false);
    bone.getWorldPosition(A); hijo.getWorldPosition(B); const actual = B.sub(A).normalize();
    qD.setFromUnitVectors(actual, dirMundo);
    bone.getWorldQuaternion(qW); bone.parent.getWorldQuaternion(qP);
    bone.quaternion.copy(qP.invert().multiply(qD.multiply(qW)));
  }
  function aplicar(pose) {
    for (const [b, q] of reposoQ) b.quaternion.copy(q);
    g.updateWorldMatrix(true, true); g.getWorldQuaternion(qG);
    for (const k of ['d', 'i']) {
      const [arm, fore, hand, dedo] = cadena[k]; if (!arm) continue;
      const [db, da, dp] = pose[k].map(v => v.clone().applyQuaternion(qG));
      apuntar(arm, fore, db); apuntar(fore, hand, da); apuntar(hand, dedo, da);
      hand.updateWorldMatrix(true, false); hand.getWorldPosition(A); dedo.getWorldPosition(B);
      const p = paletas[k]; g.worldToLocal(p.position.copy(A).lerp(B, 0.8));
      p.quaternion.setFromUnitVectors(ABAJO, pose[k][2]);
    }
    if (caminando > 0.01) for (const [k, s] of [['d', 1], ['i', -1]]) {
      const [up, leg, foot] = piernas[k]; if (!up || !foot) continue;
      const a = Math.sin(paso + (s > 0 ? 0 : Math.PI)) * 0.42 * caminando, b = Math.max(0, -Math.sin(paso + (s > 0 ? 0 : Math.PI) + 0.9)) * 0.7 * caminando;
      apuntar(up, leg, new THREE.Vector3(0, -Math.cos(a), Math.sin(a)).applyQuaternion(qG));
      apuntar(leg, foot, new THREE.Vector3(0, -Math.cos(a - b), Math.sin(a - b)).applyQuaternion(qG));
    }
  }
  let actual = null, t = 0;
  g.userData = {
    sena: null,
    hacer(id) { actual = id ? SENAS[id] : null; g.userData.sena = id || null; t = 0; },
    // vel: velocidad de avance en m/s (0 = quieto) para el balanceo de piernas
    caminar(vel) { g.userData.vel = vel; },
    vel: 0,
    actualizar(dt) { t += dt; const v = g.userData.vel || 0; caminando += ((v > 0.05 ? 1 : 0) - caminando) * Math.min(1, dt * 6); paso += dt * Math.min(9, 2.2 + v * 3.2);
      aplicar(actual ? actual.f(t) : { d: reposo(-1), i: reposo(1) }); },
    pose(id, tt) { aplicar(SENAS[id].f(tt)); },
  };
  g.userData.actualizar(0);
  return g;
}
