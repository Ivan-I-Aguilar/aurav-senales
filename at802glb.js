// AT-802 de AAXOD: modelo de simulador de vuelo (compartido gratis por su diseñador en Telegram, 30/9/2026),
// convertido y repintado con el esquema real por AURAV (herramientas/obj-a-glb.mjs + pintar-sim.mjs): envergadura
// 18,04 m, +x nariz, +z derecha, origen en el suelo entre las ruedas principales, actitud de tres puntos,
// hélice en el nodo 'helice' (gira sobre su x), 45.000 triángulos, texturas 2K.
// Expone la misma API que el modelo procedural de at802.js: userData.ponerMotor / actualizar, y los anclajes
// 'acople-carga', 'acople-carga-derecho', 'cabina-piloto' y 'helice'.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js?v=20261008a';

// Anclajes en coordenadas del avión (metros). Válvulas: bajo la panza detrás de la tolva (fotos AAXOD 24/9).
// Panza de la tolva a y≈0,75 en x=−1,6 (medido en el modelo del simulador).
const ANCLAJES = {
  'acople-carga': [-3.52, 0.715, -0.525],       // boca del camlock de cada válvula del modelo (medida: punta en y 0,728, |z| 0,52)
  'acople-carga-derecho': [-3.52, 0.715, 0.525],
  'cabina-piloto': [-1.7, 1.78, 0],
};
const ACTITUD = Math.atan2(0.86, 7.04);   // cabeceo de tres puntos del modelo
const HELICE = { pos: [2.78, 2.16, 0], cabeceo: 0.10 };   // raíz de las palas (dentro del cono de la maqueta, que va de x 2,5 a 3,19) y elevación del eje

// Hélice de código (la maqueta la tenía rota): 5 palas negras con puntas blancas. El cono (spinner) es el de la maqueta.
function crearHelice() {
  const g = new THREE.Group(); g.name = 'helice';
  const negro = new THREE.MeshStandardMaterial({ color: 0x181b1d, roughness: 0.7 }), blanco = new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const pala = new THREE.Group(); pala.rotation.x = i * Math.PI * 2 / 5;
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.25, 0.2), negro); hoja.position.y = 0.2 + 0.625; hoja.rotation.y = 0.45; pala.add(hoja);
    const punta = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.2), blanco); punta.position.y = 1.39; punta.rotation.y = 0.45; pala.add(punta);
    g.add(pala);
  }
  return g;
}

function matricula(texto) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; const g = cv.getContext('2d');
  g.clearRect(0, 0, 1024, 192); g.fillStyle = '#2a2a2c'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, 512, 96, 960);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

export async function crearAT802GLB({ matricula: mat = 'AUR-AV', url = './at802.glb' } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const avion = new THREE.Group(); avion.name = 'AT-802';
  const modelo = gltf.scene; avion.add(modelo);
  modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.roughness = 0.42; o.material.metalness = 0.05; o.material.side = THREE.DoubleSide; o.material.envMapIntensity = 0.9; } } });

  let helice = modelo.getObjectByName('helice');
  if (!helice) { helice = crearHelice(); helice.position.set(...HELICE.pos); helice.rotation.z = HELICE.cabeceo; avion.add(helice); }
  for (const [nombre, pos] of Object.entries(ANCLAJES)) { const a = new THREE.Object3D(); a.name = nombre; a.position.set(...pos); avion.add(a); }
  // (la matrícula AUR-AV va pintada en la textura del fuselaje: herramientas/pintar-sim.mjs)
  // (las válvulas de carga son las del propio modelo: caño blanco bajo la panza con palanca y camlock, x≈−3,5)
  // disco de hélice en marcha
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  disco.name = 'disco'; disco.visible = false;
  if (helice) { helice.add(disco); disco.rotation.y = Math.PI / 2; disco.position.set(0.05, 0, 0); }

  avion.userData.motor = false;
  avion.userData.ponerMotor = en => { avion.userData.motor = en; disco.visible = en; };
  avion.userData.actualizar = dt => { if (avion.userData.motor && helice) helice.rotation.x += dt * 40; };
  avion.userData.origen = 'simulador';
  return avion;
}
