// Reconocimiento de señas en Quest: los controles hacen de paletas.
// Para cada mano se mide la dirección hombro→mano y la dirección de la paleta (eje −z del control, «grip»),
// en el marco del cuerpo del alumno (el mismo de SENAS: +x = izquierda de la figura, +z = adelante, y arriba).
// Se compara contra muestras de cada seña a lo largo del tiempo; una seña queda reconocida cuando coincide
// durante ~1 s (y, si es una seña con movimiento, cuando las manos efectivamente se mueven).
import * as THREE from './three.module.js';
import { SENAS } from './senalero.js?v=20261008b';

const L_BRAZO = 0.30, L_ANTE = 0.27;
const ESTATICAS = new Set(['esperar', 'todoDespejado', 'negativo', 'posicion', 'paradaEmergencia', 'encenderMotores']);   // (encender: el giro es de muñeca, casi no mueve la mano)
// pares que con paletas son iguales en postura y sólo los distingue el contexto (o el ritmo): se aceptan entre sí
export const GRUPOS = [['paradaNormal', 'paradaEmergencia'], ['retirarCalzas', 'colocarCalzas']];
const grupo = id => GRUPOS.find(g => g.includes(id)) || [id];
// Tolerancia (Iván probó en Quest, 8/10: «ser menos estrictos»): umbral amplio, menos peso a la inclinación de la paleta y
// menos tiempo sostenido. Cuando hay una seña esperada, alcanza con parecerse a ésa (no hace falta que sea la mejor de todas).
const UMBRAL = 0.9;           // radianes promedio (brazo + paleta, dos manos)
const UMBRAL_ESPERADA = 1.25;   // (2.ª prueba en Quest: «menos estrictos»)
const SOSTENER = 0.45;        // segundos acumulados de coincidencia
const MOVIMIENTO = 0.06;      // metros que tienen que recorrer las puntas en las señas con movimiento

// muestras de cada seña: [{ d: [c, p], i: [c, p] }]
const MUESTRAS = {};
for (const [id, s] of Object.entries(SENAS)) {
  const arr = [];
  for (let t = 0; t <= 4.01; t += 0.1) {
    const p = s.f(t), m = {};
    for (const k of ['d', 'i']) { const [b, a, pal] = p[k]; m[k] = [b.clone().multiplyScalar(L_BRAZO).addScaledVector(a, L_ANTE).normalize(), pal.clone()]; }
    arr.push(m);
  }
  MUESTRAS[id] = arr;
}

export function crearDetector() {
  const acum = {}; let historial = []; let ultima = null;   // posiciones de manos para medir movimiento
  const fw = new THREE.Vector3(), der = new THREE.Vector3(), hombro = new THREE.Vector3(), v = new THREE.Vector3(), w = new THREE.Vector3();
  const aCuerpo = (vec, out) => out.set(-vec.dot(der), vec.y, vec.dot(fw));   // mundo → marco del cuerpo

  function puntajes(cabeza, manos) {
    // cabeza: { pos, quat }; manos: { d: { pos, quat } | null, i: ... }
    fw.set(0, 0, -1).applyQuaternion(cabeza.quat); fw.y = 0; if (fw.lengthSq() < 1e-4) fw.set(0, 0, -1); fw.normalize();
    der.set(-fw.z, 0, fw.x);   // derecha del alumno
    const med = {};
    for (const [k, s] of [['d', 1], ['i', -1]]) {
      const m = manos[k]; if (!m) return null;
      hombro.copy(cabeza.pos).addScaledVector(der, 0.19 * s); hombro.y -= 0.24;
      aCuerpo(v.copy(m.pos).sub(hombro), w); const c = w.clone().normalize();
      aCuerpo(v.set(0, 0, -1).applyQuaternion(m.quat), w); const p = w.clone().normalize();
      med[k] = [c, p];
    }
    ultima = med;
    const out = {};
    for (const [id, arr] of Object.entries(MUESTRAS)) {
      let mejor = 9;
      for (const m of arr) { let e = 0; for (const k of ['d', 'i']) e += med[k][0].angleTo(m[k][0]) + 0.15 * med[k][1].angleTo(m[k][1]); e /= 2.3; /* casi todo el peso en la posición de los brazos */ if (e < mejor) mejor = e; }
      out[id] = mejor;
    }
    return out;
  }

  return {
    reiniciar() { for (const k in acum) acum[k] = 0; historial = []; },
    // devuelve { reconocida, mejor, error }
    evaluar(cabeza, manos, dt, esperada = null) {
      const p = puntajes(cabeza, manos); if (!p) return { reconocida: null };
      const punta = m => m.pos.clone().add(new THREE.Vector3(0, 0, -0.4).applyQuaternion(m.quat));   // punta de la paleta
      historial.push([punta(manos.d), punta(manos.i)]); if (historial.length > 60) historial.shift();
      let mov = 0; if (historial.length > 10) { for (const k of [0, 1]) { const b = new THREE.Box3(); historial.forEach(h => b.expandByPoint(h[k])); mov = Math.max(mov, b.getSize(new THREE.Vector3()).length()); } }
      let mejor = null, e = 9; for (const [id, x] of Object.entries(p)) if (x < e) { e = x; mejor = id; }
      // brazos colgando en reposo no cuentan como seña: al menos un brazo tiene que separarse ~20° de la vertical
      const abajo = new THREE.Vector3(0, -1, 0); const activo = ultima ? Math.max(...['d', 'i'].map(k => ultima[k][0].angleTo(abajo))) > 0.35 : true;
      const esp = esperada ? grupo(esperada) : null;
      for (const id of Object.keys(p)) {
        const seMueve = activo && (ESTATICAS.has(id) || mov > MOVIMIENTO);
        const ok = esp ? (esp.includes(id) && Math.min(...esp.map(x => p[x])) < UMBRAL_ESPERADA && seMueve)
                       : (grupo(mejor).includes(id) && p[mejor] < UMBRAL && seMueve);
        acum[id] = ok ? (acum[id] || 0) + dt : Math.max(0, (acum[id] || 0) - dt);
      }
      let reconocida = null;
      for (const id of Object.keys(p)) if (acum[id] >= SOSTENER) { reconocida = esperada && grupo(id).includes(esperada) ? esperada : id; this.reiniciar(); break; }
      return { reconocida, mejor, error: e };
    },
    puntajes,
  };
}
