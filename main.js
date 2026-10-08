// AURAV · Señaleros de plataforma — juego para el curso de Personal de Rampa de AAXOD.
// Fases: 1) observar la llegada, 2) observar la salida, 3) equipo de protección, 4) protagonizar la llegada,
// 5) protagonizar la salida, 6) resultado. En Quest, los controles son las paletas y las señas se reconocen por
// la posición de las manos; en PC/celular, las señas se eligen en un menú.
// Contenido del curso: las 12 señas de la lámina «Tipos de señales» (AAXOD). Lo demás (secuencias, saludo,
// posición, calzas, diamante, FOD, EPP) sigue OACI / lo indicado por Iván y queda «a validar» con AAXOD.
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js?v=20261008a';
import { crearEscenario } from './escenario.js?v=20261008a';
import { crearAT802GLB } from './at802glb.js?v=20261008a';
import { crearSenaleroGLB, crearSenalero, SENAS, ORDEN_CURSO } from './senalero.js?v=20261008b';
import { crearPlataforma, estacionarAviones, crearCono, crearCalza, crearFOD, crearEPP, crearPaleta,
  PUESTO, POS_SENALERO, CONOS_DIAMANTE, CALZAS, LLEGADA, SALIDA, PARADA } from './plataforma.js?v=20261008b';
import { crearDetector } from './gestos.js?v=20261008b';
import { crearPanelVR } from './panelvr.js?v=20261008b';
import { crearAudio } from './audio.js?v=20261008a';
import { Constancia } from './constancia.js?v=20261008b';

const ALTURA_OJOS = 1.70;          // punto de vista del protagonista (pedido de Iván)
const ALCANCE = 4.5;               // distancia máxima para levantar FOD / poner conos
const $ = id => document.getElementById(id);

// ---------- motor gráfico
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
$('lienzo').appendChild(renderer.domElement);
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 900);
const rig = new THREE.Group(); rig.add(camara); escena.add(rig);
camara.position.y = ALTURA_OJOS;
const ambiente = crearEscenario(escena);
{ const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6f97c0'); gr.addColorStop(0.48, '#e8eef2'); gr.addColorStop(0.52, '#9a9c8b'); gr.addColorStop(1, '#4a4f40');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); escena.environment = pm.fromEquirectangular(t).texture; escena.environmentIntensity = 0.8; pm.dispose(); }
crearPlataforma(escena);
const audio = crearAudio(camara);

const progreso = $('cargando');
const avion = await crearAT802GLB(); escena.add(avion); avion.updateMatrixWorld(true);
const helice = avion.getObjectByName('helice'), disco = avion.getObjectByName('disco');
progreso.textContent = 'Cargando señaleros…';
const loader = new GLTFLoader();
const senalero = crearSenaleroGLB(await loader.loadAsync('./senalero.glb'), { alto: 1.75 }); escena.add(senalero);
const tutor = crearSenaleroGLB(await loader.loadAsync('./senalero.glb'), { alto: 1.72 }); escena.add(tutor);
progreso.textContent = 'Cargando plataforma…';
await estacionarAviones(escena);
const hilux = new THREE.Group(); { const g = await loader.loadAsync('./hilux.glb'); hilux.add(g.scene); hilux.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
hilux.visible = false; escena.add(hilux);
const motorSonido = audio.posicional(avion, audio.buffers.turbina, { loop: true, volumen: 0, ref: 6 });
progreso.remove();

// ---------- estado del avión de la práctica
const A = { tr: LLEGADA, s: 0, v: 0, objetivo: 0, vmax: 2, rpm: 0, motor: false, frenoFuerte: false };
function ponerAvion(tr, s) { A.tr = tr; A.s = A.objetivo = s; A.v = 0; colocarAvion(); }
function colocarAvion() { const p = A.tr.en(A.s); avion.position.copy(p.p); avion.rotation.y = p.r; avion.updateMatrixWorld(true); }
function moverAvion(hasta, vmax = 2) { A.objetivo = hasta; A.vmax = vmax; A.frenoFuerte = false; }
function pararAvion(fuerte = true) { A.frenoFuerte = fuerte; const dec = fuerte ? 3 : 1; A.objetivo = A.s + (A.v * A.v) / (2 * dec); }
function actualizarAvion(dt) {
  const dist = A.objetivo - A.s, dec = A.frenoFuerte ? 3 : 1;
  const vDeseada = dist > 0.01 ? Math.min(A.vmax, Math.sqrt(2 * dec * dist)) : 0;
  A.v += THREE.MathUtils.clamp(vDeseada - A.v, -dec * dt * 1.5, 0.9 * dt);
  if (A.v < 0) A.v = 0; A.s = Math.min(A.s + A.v * dt, A.tr.largo); colocarAvion();
  A.rpm += THREE.MathUtils.clamp((A.motor ? 1 : 0) - A.rpm, -dt * 0.25, dt * 0.22);
  if (helice) helice.rotation.x += dt * 45 * A.rpm * A.rpm;
  if (disco) disco.visible = A.rpm > 0.7;
  const vol = A.rpm * (epp.protectores ? 0.35 : 1);
  if (audio.oyente.context.state === 'running') { if (A.rpm > 0.02 && !motorSonido.isPlaying) motorSonido.play(); if (A.rpm <= 0.02 && motorSonido.isPlaying) motorSonido.stop();
    motorSonido.setVolume(vol * 1.3); if (motorSonido.isPlaying) motorSonido.setPlaybackRate(0.55 + 0.45 * A.rpm); }
}
const enAvion = (x, y, z) => avion.localToWorld(new THREE.Vector3(x, y, z));

// ---------- personajes: señalero 3D (fases de observación) y tutor de punta de ala
senalero.position.copy(POS_SENALERO);
function mirarAvion(p) { const c = enAvion(-1.7, 0, 0); p.lookAt(c.x, 0, c.z); }
const T = { modo: 'ala', destino: null, vel: 1.6 };   // modo: 'ala' (acompaña en la punta del ala izquierda), 'ir' (camina a un punto), 'quieto'
function tutorIrA(p, vel = 1.6) { T.modo = 'ir'; T.destino = p.clone(); T.vel = vel; return esperarQue(() => tutor.position.distanceTo(T.destino) < 0.15); }
function tutorAlAla() { T.modo = 'ala'; }
function tutorAlAlaYa() { T.modo = 'ala'; tutor.position.copy(enAvion(PUNTA_ALA.x, 0, PUNTA_ALA.z)).setY(0); tutor.rotation.y = avion.rotation.y - Math.PI / 2; }
const PUNTA_ALA = new THREE.Vector3(-0.8, 0, -11.2);
function actualizarTutor(dt) {
  let dest = null, vel = T.vel;
  if (T.modo === 'ala') { dest = enAvion(PUNTA_ALA.x, 0, PUNTA_ALA.z); dest.y = 0; vel = Math.max(1.6, A.v * 1.4); }
  if (T.modo === 'ir') dest = T.destino;
  let v = 0;
  if (dest) { const d = dest.clone().sub(tutor.position); d.y = 0; const L = d.length();
    if (L > 0.05) { const paso = Math.min(L, vel * dt); tutor.position.addScaledVector(d.normalize(), paso); v = paso / dt;
      const ang = Math.atan2(d.x, d.z); tutor.rotation.y += Math.atan2(Math.sin(ang - tutor.rotation.y), Math.cos(ang - tutor.rotation.y)) * Math.min(1, dt * 6); } }
  if (v < 0.05) { const c = enAvion(1.0, 0, 0); const ang = Math.atan2(c.x - tutor.position.x, c.z - tutor.position.z); tutor.rotation.y += Math.atan2(Math.sin(ang - tutor.rotation.y), Math.cos(ang - tutor.rotation.y)) * Math.min(1, dt * 3); }
  tutor.userData.caminar(v); tutor.userData.actualizar(dt);
}

// ---------- objetos de la plataforma
const calzas = CALZAS.map(() => { const c = crearCalza(); c.visible = false; escena.add(c); return c; });
function ponerCalzas(v) { calzas.forEach((c, i) => { c.visible = v; c.position.copy(enAvion(CALZAS[i][0], 0, CALZAS[i][1])); c.rotation.y = avion.rotation.y; }); }
const conos = CONOS_DIAMANTE.map(() => { const c = crearCono(); c.visible = false; escena.add(c); return c; });
const fantasmas = CONOS_DIAMANTE.map(() => { const c = crearCono(); c.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; o.material.depthWrite = false; o.castShadow = false; } }); c.visible = false; escena.add(c); return c; });
function ubicarConos() { CONOS_DIAMANTE.forEach(([x, z], i) => { const p = enAvion(x, 0, z); p.y = 0; conos[i].position.copy(p); fantasmas[i].position.copy(p); }); }
const mesaEPP = crearEPP(); mesaEPP.position.set(POS_SENALERO.x - 4.5, 0, POS_SENALERO.z - 2.5); mesaEPP.rotation.y = 0.4; escena.add(mesaEPP);
let fods = [];
function sembrarFOD(lista) { fods.forEach(f => escena.remove(f)); fods = lista.map(([tipo, x, z]) => { const f = crearFOD(tipo); f.position.set(x, 0, z); f.rotation.y = x * 3.1; escena.add(f); return f; }); }

// ---------- protagonista: posición, EPP, paletas en VR
const epp = { chaleco: false, protectores: false, paletas: false };
const posAlumno = () => { const p = new THREE.Vector3(); camara.getWorldPosition(p); p.y = 0; return p; };
function teletransportar(x, z, mirar) { rig.position.x = x; rig.position.z = z; if (renderer.xr.isPresenting) { const c = new THREE.Vector3(); camara.getWorldPosition(c); rig.position.x += x - c.x; rig.position.z += z - c.z; }
  if (mirar) { const d = new THREE.Vector3(mirar.x - x, 0, mirar.z - z); if (renderer.xr.isPresenting) { const q = new THREE.Quaternion(); camara.getWorldQuaternion(q); const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); const actual = Math.atan2(-f.x, -f.z), quiero = Math.atan2(-d.x, -d.z); girarRig(quiero - actual); }
    else { yaw = Math.atan2(-d.x, -d.z); pitch = -0.03; camara.rotation.set(pitch, yaw, 0, 'YXZ'); } } }
function girarRig(a) { const c = new THREE.Vector3(); camara.getWorldPosition(c); rig.position.sub(c).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).add(c); rig.rotation.y += a; }

// ---------- interfaz (PC/celular) y VR
const panelVR = crearPanelVR(); escena.add(panelVR.malla);
const cartelVR = (() => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const g = cv.getContext('2d'); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false })); m.renderOrder = 11; m.position.set(0, -0.3, -1.1); m.visible = false; camara.add(m);
  let ultimo = ''; return { malla: m, poner(texto, sena) { const k = texto + '|' + sena; if (k === ultimo) return; ultimo = k; g.clearRect(0, 0, 1024, 256); g.fillStyle = 'rgba(8,36,64,0.82)'; g.beginPath(); g.roundRect(0, 0, 1024, 256, 30); g.fill();
    g.fillStyle = '#fff'; g.font = '30px Arial'; let y = 22, l = ''; const lineas = []; for (const p of String(texto).split(' ')) { const tt = l ? l + ' ' + p : p; if (g.measureText(tt).width > 970 && l) { lineas.push(l); l = p; } else l = tt; } lineas.push(l);
    g.textBaseline = 'top'; for (const li of lineas.slice(0, 4)) { g.fillText(li, 26, y); y += 38; }
    if (sena) { g.fillStyle = '#c8e63a'; g.font = 'bold 30px Arial'; g.fillText(sena, 26, 200); } t.needsUpdate = true; } }; })();
let textoTutor = '', vozOn = true;
function decir(texto, { hablar = true } = {}) {
  textoTutor = texto; $('tutor-texto').textContent = texto; $('tutor').hidden = !texto;
  if (hablar && vozOn && texto && 'speechSynthesis' in window) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texto.replace(/«|»/g, '')); u.lang = 'es-AR'; u.rate = 1.05;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith('es')); if (v) u.voice = v; speechSynthesis.speak(u); } catch { } }
}
$('voz').onclick = () => { vozOn = !vozOn; $('voz').textContent = vozOn ? 'Voz: sí' : 'Voz: no'; if (!vozOn && 'speechSynthesis' in window) speechSynthesis.cancel(); };
function rotulo(texto) { $('cartel').textContent = texto || ''; $('cartel').hidden = !texto; ultimoRotulo = texto || ''; }
let ultimoRotulo = '';
function faseTitulo(t) { $('fase').textContent = t; }
function tareas(lista) { const el = $('tareas'); el.innerHTML = ''; el.hidden = !lista; if (!lista) return; for (const [txt, ok] of lista) { const li = document.createElement('li'); li.textContent = txt; if (ok) li.className = 'ok'; el.appendChild(li); } }

// panel modal: HTML en pantalla, panel flotante en VR
let preguntaActual = null;
function mostrarPreguntaHTML({ titulo, texto, botones, fin }) {
  if ($('nombre-cert').hidden === false && !/promedio/.test(titulo)) $('nombre-cert').hidden = true;
  $('panel-titulo').textContent = titulo; $('panel-texto').innerHTML = texto.replace(/\n/g, '<br>'); const cont = $('panel-botones'); cont.innerHTML = '';
  for (const b of botones) { const e = document.createElement('button'); e.textContent = b.texto; if (b.secundario) e.className = 'sec'; e.onclick = () => fin(b.id); cont.appendChild(e); }
  $('panel').hidden = false;
}
function preguntar(titulo, texto, botones) {
  return new Promise(res => {
    const fin = id => { preguntaActual = null; $('panel').hidden = true; panelVR.ocultar(); res(id); };
    preguntaActual = { titulo, texto, botones, fin };
    if (renderer.xr.isPresenting) { panelVR.mostrar({ titulo, texto, botones }, fin, camara); return; }
    mostrarPreguntaHTML(preguntaActual); return;
  });
}

// ---------- tareas asíncronas (cada fase corre como una función async; «corrida» permite cortarla)
let corrida = 0; const vigilantes = [];
class Corte extends Error { }
function esperarQue(cond) { const tok = corrida; return new Promise((res, rej) => vigilantes.push({ cond, res, rej, tok })); }
function esperar(seg) { let t = 0; return esperarQue(() => (t += dtActual) >= seg); }
function revisarVigilantes() { for (let i = vigilantes.length - 1; i >= 0; i--) { const w = vigilantes[i]; if (w.tok !== corrida) { vigilantes.splice(i, 1); w.rej(new Corte()); continue; } if (w.cond()) { vigilantes.splice(i, 1); w.res(); } } }
let dtActual = 0;

// ---------- señas del alumno
let modoSenas = false, esperada = null, alResolver = null, ultimaSena = null, errores = [], tEsperando = 0, intentosMal = 0;
const NOMBRE = id => SENAS[id].nombre.replace(' (a validar)', '');
function registrarError(txt) { errores.push(txt); audio.mal(); }
function senaDelAlumno(id, origen = 'menu') {
  if (!modoSenas) return;
  ultimaSena = { id, t: performance.now() }; preview.userData.hacer(id); vistaPrevia(true);
  $('mi-sena').textContent = 'Tu seña: ' + NOMBRE(id); cartelVR.poner(textoTutor, 'Tu seña: ' + NOMBRE(id));
  if (!esperada) return;
  const ok = esperada.includes(id);
  if (!ok && origen === 'gesto') return;   // en VR una postura de paso puede parecerse a otra seña: sólo se muestra, no se penaliza
  if (ok) { const r = alResolver; esperada = null; alResolver = null; audio.ok(); r(id); }
  else { intentosMal++; registrarError(`Seña equivocada: «${NOMBRE(id)}» cuando correspondía «${NOMBRE(esperada[0])}»`);
    decir(`No. Hiciste «${NOMBRE(id)}». El piloto no va a entender esa indicación ahora.` + (intentosMal >= 2 ? ` Pista: la seña es «${NOMBRE(esperada[0])}».` : ' Pensá qué necesita hacer el avión.')); }
}
function esperarSena(ids, { pista = 14 } = {}) {
  const lista = Array.isArray(ids) ? ids : [ids]; esperada = lista; intentosMal = 0; tEsperando = 0; pistaDada = false; pistaSeg = pista; detector.reiniciar();
  const tok = corrida; return new Promise((res, rej) => { let hecho = false; const mio = id => { hecho = true; res(id); }; alResolver = mio;
    vigilantes.push({ cond: () => hecho, res() { }, rej: () => { if (alResolver === mio) { esperada = null; alResolver = null; } rej(new Corte()); }, tok }); });
}
let pistaDada = false, pistaSeg = 14;
function revisarPista(dt) { if (!esperada) return; tEsperando += dt; if (!pistaDada && tEsperando > pistaSeg) { pistaDada = true; decir(`Pista: el piloto espera la seña «${NOMBRE(esperada[0])}».`); } }

// menú de señas (PC/celular): orden de la lámina del curso + extras al final
const contSenas = $('senas');
for (const id of [...ORDEN_CURSO, ...Object.keys(SENAS).filter(i => SENAS[i].extra)]) { const b = document.createElement('button'); b.textContent = NOMBRE(id); b.onclick = () => senaDelAlumno(id); contSenas.appendChild(b); }
function mostrarMenuSenas(v) { modoSenas = v; contSenas.hidden = !v || renderer.xr.isPresenting; $('mi-sena').hidden = !v; if (!v) vistaPrevia(false); }

// vista previa de la seña del alumno (figura por código en una esquina)
const escenaPrev = new THREE.Scene(); escenaPrev.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2)); { const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(1, 2, 3); escenaPrev.add(d); }
const preview = crearSenalero(); escenaPrev.add(preview);
const camPrev = new THREE.PerspectiveCamera(32, 0.75, 0.1, 20); camPrev.position.set(0, 1.25, 4.6); camPrev.lookAt(0, 1.15, 0);
let prevVisible = false; function vistaPrevia(v) { prevVisible = v; }

// ---------- detección de gestos (VR)
const detector = crearDetector();
const controles = [0, 1].map(i => { const c = renderer.xr.getController(i), g = renderer.xr.getControllerGrip(i); rig.add(c); rig.add(g);
  const pal = crearPaleta(); pal.rotation.x = -Math.PI / 2; pal.position.z = 0.02; pal.visible = false; g.add(pal);   // la paleta sale hacia −z del grip
  const rayo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xc8e63a })); rayo.scale.z = 5; rayo.visible = false; c.add(rayo);
  const o = { c, g, pal, rayo, lado: null, fuente: null, prev: {} };
  c.addEventListener('connected', e => { o.lado = e.data.handedness; o.fuente = e.data; });
  c.addEventListener('disconnected', () => { o.lado = null; o.fuente = null; });
  c.addEventListener('selectstart', () => gatilloVR(o));
  return o; });
const manoVR = lado => controles.find(o => o.lado === lado);

// ---------- interactivos (FOD, conos, EPP): click en PC, rayo + gatillo en VR
let interactivos = [];   // { obj, alTocar }
const ray = new THREE.Raycaster();
function tocar(origen, dir) {
  ray.set(origen, dir); ray.far = 60;
  const objs = interactivos.filter(i => i.obj.visible).map(i => i.obj); const hit = ray.intersectObjects(objs, true)[0]; if (!hit) return false;
  const it = interactivos.find(i => { let o = hit.object; while (o) { if (o === i.obj) return true; o = o.parent; } return false; });
  if (!it) return false;
  const pw = it.obj.getWorldPosition(new THREE.Vector3()); pw.y = 0;
  if (posAlumno().distanceTo(pw) > ALCANCE + (it.alcanceExtra || 0)) { decir('Está lejos: acercate caminando para alcanzarlo.', { hablar: false }); audio.aviso(); return true; }
  it.alTocar(it); return true;
}
function gatilloVR(o) {
  if (panelVR.gatillo(o.c)) return;
  const m = new THREE.Matrix4().extractRotation(o.c.matrixWorld); const p = new THREE.Vector3().setFromMatrixPosition(o.c.matrixWorld); tocar(p, new THREE.Vector3(0, 0, -1).applyMatrix4(m));
}

// ---------- controles de PC
let yaw = 0, pitch = 0, arrastre = null, movido = 0, caminarA = null; const teclas = {};
renderer.domElement.addEventListener('pointerdown', e => { arrastre = [e.clientX, e.clientY]; movido = 0; });
addEventListener('pointermove', e => { if (!arrastre || renderer.xr.isPresenting) return; const dx = e.clientX - arrastre[0], dy = e.clientY - arrastre[1]; movido += Math.abs(dx) + Math.abs(dy);
  yaw -= dx * 0.004; pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, -1.2, 1.2); arrastre = [e.clientX, e.clientY]; camara.rotation.set(pitch, yaw, 0, 'YXZ'); });
renderer.domElement.addEventListener('pointerup', e => { const fue = movido < 8; arrastre = null; if (!fue || renderer.xr.isPresenting) return;
  const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camara);
  if (tocar(ray.ray.origin.clone(), ray.ray.direction.clone())) return;
  if (!puedeCaminar) return; const t = -ray.ray.origin.y / ray.ray.direction.y; if (t > 0 && t < 80) caminarA = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t); });
addEventListener('pointerup', () => arrastre = null);
addEventListener('keydown', e => teclas[e.code] = true); addEventListener('keyup', e => teclas[e.code] = false);
let puedeCaminar = false, vistaCabina = false;
function moverPC(dt) {
  if (vistaCabina) { const p = enAvion(-2.0, 0, 0); rig.position.set(p.x, 0, p.z); camara.position.y = 3.0; camara.rotation.set(pitch, yaw + avion.rotation.y - Math.PI / 2, 0, 'YXZ'); return; }
  camara.position.y = ALTURA_OJOS; if (!puedeCaminar) return;
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), r = new THREE.Vector3(-f.z, 0, f.x), m = new THREE.Vector3();
  if (teclas.KeyW || teclas.ArrowUp) m.add(f); if (teclas.KeyS || teclas.ArrowDown) m.sub(f); if (teclas.KeyD || teclas.ArrowRight) m.add(r); if (teclas.KeyA || teclas.ArrowLeft) m.sub(r);
  if (m.lengthSq() > 0) { caminarA = null; rig.position.addScaledVector(m.normalize(), 2.2 * dt); }
  if (caminarA) { const d = caminarA.clone().sub(rig.position); d.y = 0; const L = d.length(); if (L < 0.1) caminarA = null; else rig.position.addScaledVector(d.normalize(), Math.min(L, 2.6 * dt)); }
}
$('cabina').onclick = () => { vistaCabina = !vistaCabina; $('cabina').classList.toggle('activa', vistaCabina); if (vistaCabina) { yaw = 0; pitch = -0.08; } else { teletransportar(rig.position.x, rig.position.z); vistaObservador(); } };
function vistaObservador() { teletransportar(POS_SENALERO.x - 3.5, POS_SENALERO.z - 3, enAvion(0, 0, 0)); }

// ---------- VR
const botonVR = $('entrar-vr');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) botonVR.hidden = false; });
let calibrar = 0;
botonVR.onclick = async () => { audio.reanudar(); const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }); await renderer.xr.setSession(s);
  camara.position.set(0, 0, 0); cartelVR.malla.visible = true; contSenas.hidden = true; calibrar = 0.6; menuVRAbierto = false;
  if (preguntaActual) { $('panel').hidden = true; const p = preguntaActual; setTimeout(() => panelVR.mostrar(p, p.fin, camara), 800); }
  s.addEventListener('end', () => { cartelVR.malla.visible = false; rig.position.y = 0; rig.rotation.y = 0; camara.position.set(0, ALTURA_OJOS, 0); mostrarMenuSenas(modoSenas); panelVR.ocultar(); menuVRAbierto = false; if (preguntaActual) mostrarPreguntaHTML(preguntaActual); }); };
let giroListo = true, menuVRAbierto = false;
function actualizarVR(dt) {
  if (calibrar > 0) { calibrar -= dt; if (calibrar <= 0) rig.position.y = ALTURA_OJOS - camara.position.y; }   // ojos a 1,70 m sobre la plataforma
  for (const o of controles) {
    o.pal.visible = epp.paletas;
    const dist = panelVR.apuntar(o.c); o.rayo.visible = panelVR.visible || interactivos.length > 0; o.rayo.scale.z = dist ?? 5;
    const gp = o.fuente?.gamepad; if (!gp) continue;
    const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0], gp.axes[1]];
    if (o.lado === 'left' && puedeCaminar) { const q = new THREE.Quaternion(); camara.getWorldQuaternion(q); const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); f.y = 0; f.normalize(); const r = new THREE.Vector3(-f.z, 0, f.x);
      if (Math.hypot(ax[0], ax[1]) > 0.2) rig.position.addScaledVector(f, -ax[1] * 2 * dt).addScaledVector(r, ax[0] * 2 * dt); }
    if (o.lado === 'right') { if (Math.abs(ax[0]) > 0.7 && giroListo) { girarRig(-Math.sign(ax[0]) * Math.PI / 6); giroListo = false; } if (Math.abs(ax[0]) < 0.3) giroListo = true; }
    const btn = gp.buttons[4]?.pressed; if (btn && !o.prev.b4 && modoSenas) abrirMenuVR(); o.prev.b4 = btn;
  }
  // reconocimiento de señas con las paletas
  if (modoSenas && epp.paletas && !panelVR.visible) {
    const d = manoVR('right'), i = manoVR('left');
    if (d && i) { const cab = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }; camara.getWorldPosition(cab.pos); camara.getWorldQuaternion(cab.quat);
      const mano = o => ({ pos: new THREE.Vector3().setFromMatrixPosition(o.g.matrixWorld), quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(o.g.matrixWorld)) });
      const r = detector.evaluar(cab, { d: mano(d), i: mano(i) }, dt, esperada?.[0]); if (r.reconocida) senaDelAlumno(r.reconocida, 'gesto'); }
  }
  cartelVR.poner(textoTutor, ultimoRotulo);
}
function abrirMenuVR() { if (menuVRAbierto) return; menuVRAbierto = true;
  const ids = [...ORDEN_CURSO, ...Object.keys(SENAS).filter(i => SENAS[i].extra)];
  panelVR.mostrar({ titulo: 'Elegí la seña', texto: 'Si el reconocimiento no te toma la seña, elegila acá.', botones: [...ids.map(id => ({ id, texto: NOMBRE(id) })), { id: '_cerrar', texto: 'Cerrar' }] },
    id => { panelVR.ocultar(); menuVRAbierto = false; if (id !== '_cerrar') senaDelAlumno(id, 'menu'); }, camara); }

// ---------- utilidades de las fases
function reiniciarMundo() {
  A.motor = false; A.rpm = 0; ponerAvion(LLEGADA, PARADA); ponerCalzas(false); conos.forEach(c => c.visible = false); fantasmas.forEach(c => c.visible = false);
  sembrarFOD([]); interactivos = []; hilux.visible = false; senalero.visible = true; senalero.userData.hacer(null); tutor.visible = true; T.modo = 'ala';
  tutor.position.copy(enAvion(PUNTA_ALA.x, 0, PUNTA_ALA.z)).setY(0); mostrarMenuSenas(false); tareas(null); rotulo(''); puedeCaminar = false; vistaCabina = false; $('cabina').hidden = true; $('cabina').classList.remove('activa');
}
async function senaObs(id, seg = 0) { senalero.userData.hacer(id); rotulo('Señalero: ' + NOMBRE(id)); if (seg) await esperar(seg); }
async function cruceHilux(alPasarFrente) {
  hilux.visible = true; const z = POS_SENALERO.z + 18; let x = 26; hilux.position.set(x, 0, z); hilux.rotation.y = Math.PI; let avisado = false;
  await esperarQue(() => { x -= 7 * dtActual; hilux.position.x = x; if (!avisado && x < 12) { avisado = true; alPasarFrente?.(); } return x < -32; });
  hilux.visible = false;
}
function vigilarPosicion() {   // el piloto tiene que verte: si te alejás de la posición, para
  let fuera = false, guardado = null; return () => { const d = posAlumno().distanceTo(POS_SENALERO);
    if (d > 3 && !fuera && A.v > 0.05) { fuera = true; guardado = [A.objetivo, A.vmax]; pararAvion(true); registrarError('Te alejaste de la posición de señalero con el avión en movimiento'); decir('¡Volvé a tu posición! El piloto te perdió de vista y frenó. Sin contacto visual con el señalero, el avión no se mueve.'); }
    if (d <= 2.5 && fuera) { fuera = false; moverAvion(...guardado); decir('Bien, el piloto te ve de nuevo. Retomá la indicación.'); return 'volvio'; } return fuera ? 'fuera' : 'ok'; }; }

// ---------- FASES
const RES = { reaccion: null, parada: null, inicio: 0 };
async function intro() {
  reiniciarMundo(); faseTitulo('Señaleros de plataforma'); ponerAvion(LLEGADA, PARADA); A.motor = false; ponerCalzas(true); ubicarConos(); conos.forEach(c => c.visible = true);
  teletransportar(POS_SENALERO.x - 3.5, POS_SENALERO.z - 3, enAvion(0, 0, 0)); senalero.userData.hacer('saludo');
  const r = await preguntar('Señaleros de plataforma', 'Curso de Personal de Rampa · AAXOD\n\nPrimero vas a OBSERVAR cómo un señalero guía la llegada y la salida de un AT-802. Después vas a ser el PROTAGONISTA: te ponés el equipo, controlás el FOD, te parás a 32 m de la nariz y guiás al piloto.\n\nEn Quest los controles son tus paletas. En PC o celular elegís las señas en el menú de abajo.',
    [{ id: 'empezar', texto: 'Empezar' }, { id: 'elegir', texto: 'Ir a una fase', secundario: true }]);
  audio.reanudar();
  if (r === 'elegir') { const f = await preguntar('Ir a una fase', '', [{ id: 'obsLlegada', texto: '1 · Observar llegada' }, { id: 'obsSalida', texto: '2 · Observar salida' }, { id: 'equipo', texto: '3 · Equipo de protección' }, { id: 'protLlegada', texto: '4 · Guiar la llegada' }, { id: 'protSalida', texto: '5 · Guiar la salida' }]); return f; }
  return 'obsLlegada';
}

async function obsLlegada() {
  reiniciarMundo(); faseTitulo('1 · Observá la llegada'); $('cabina').hidden = false;
  ponerAvion(LLEGADA, 0); A.motor = true; A.rpm = 1; tutorAlAlaYa(); vistaObservador();
  decir('Soy tu compañero de punta de ala. Mirá al señalero: está parado sobre la marca, a 32 metros de donde va a quedar la nariz. Desde ahí el piloto lo ve siempre. Podés girar la vista o ponerte en la cabina para ver lo que ve el piloto.');
  await esperar(7);
  decir('Primero saluda al piloto que llega, para que lo identifique como su señalero.'); await senaObs('saludo', 4);
  decir('Después le indica la posición: este es tu puesto.'); await senaObs('posicion', 4);
  decir('«Avanzar»: el avión rueda por la calle de rodaje.'); await senaObs('avanzar'); moverAvion(17, 2.2); await esperarQue(() => A.s >= 16.5);
  decir('«Giro a la derecha», desde el punto de vista del piloto: el brazo izquierdo del señalero queda extendido y el derecho marca el giro.'); await senaObs('giroDerecha'); moverAvion(29.4, 1.5); await esperarQue(() => A.s >= 29);
  decir('De nuevo «avanzar», ahora derecho hacia el señalero.'); await senaObs('avanzar'); moverAvion(36, 1.8);
  await esperarQue(() => A.s >= 31);
  decir('¡Atención! Una camioneta cruza delante del avión: «parada de emergencia» enseguida.');
  const cruce = cruceHilux(); await esperar(0.6); await senaObs('paradaEmergencia'); pararAvion(true);
  await cruce; decir('El vehículo pasó y la zona quedó libre. El señalero retoma: «avanzar».'); await senaObs('avanzar', 1); moverAvion(36, 1.6); await esperarQue(() => A.s >= 35.6);
  decir('Cerca de la marca: «bajar velocidad».'); await senaObs('bajarVelocidad'); moverAvion(PARADA, 0.7); await esperarQue(() => A.s >= PARADA - 0.4);
  decir('«Parada normal» justo sobre la barra amarilla.'); await senaObs('paradaNormal'); pararAvion(false); await esperar(3);
  decir('Con el avión detenido, se colocan las calzas.'); await senaObs('colocarCalzas'); T.modo = 'ir'; await tutorIrA(enAvion(-1.3, 0, -2.3)); ponerCalzas(true); audio.ok(); await esperar(1); tutorAlAla(); await esperar(1.5);
  decir('Calzas puestas: ahora sí, «detener motores».'); await senaObs('detenerMotores'); A.motor = false; await esperar(5);
  senalero.userData.hacer(null); rotulo('');
  decir('Por último se arma el diamante de seguridad: un cono en la nariz, uno en cada punta de ala y dos en la cola. Nadie entra con vehículos ni equipos dentro de ese perímetro.');
  ubicarConos(); for (const c of conos) { c.visible = true; audio.aviso(); await esperar(0.7); }
  await esperar(4);
  return await preguntar('Llegada observada', 'Viste la secuencia completa de llegada: saludo, posición, avanzar, giro, avanzar, parada de emergencia ante el vehículo, bajar velocidad, parada normal, calzas, detener motores y diamante.', [{ id: 'obsSalida', texto: 'Continuar' }, { id: 'obsLlegada', texto: 'Repetir', secundario: true }]);
}

async function obsSalida() {
  reiniciarMundo(); faseTitulo('2 · Observá la salida'); $('cabina').hidden = false;
  ponerAvion(SALIDA, 0); A.motor = false; ponerCalzas(true); ubicarConos(); conos.forEach(c => c.visible = true); vistaObservador();
  sembrarFOD([['piedra', 3, -10], ['precinto', -1.2, -12], ['tornillo', 6.5, -19]]);
  decir('Antes de la salida: control de FOD. Cualquier objeto suelto puede ser aspirado por el motor o despedido por la hélice.');
  T.modo = 'ir'; for (const f of [...fods]) { await tutorIrA(f.position.clone().add(new THREE.Vector3(0.5, 0, 0.5))); f.visible = false; audio.ok(); } await esperar(0.5);
  decir('Después se retiran los conos del diamante, para dejar libre el camino.');
  for (const c of conos) { await tutorIrA(c.position.clone().add(new THREE.Vector3(0.6, 0, 0))); c.visible = false; audio.aviso(); }
  tutorAlAla(); await esperarQue(() => tutor.position.distanceTo(enAvion(PUNTA_ALA.x, 0, PUNTA_ALA.z).setY(0)) < 0.3);
  decir('El encendido es tan importante como la guía: el señalero verifica que la zona de la hélice esté libre de personas, equipos y FOD, que haya contacto visual con el piloto y que las calzas sigan puestas.'); await esperar(9);
  decir('Recién entonces: «encender motores».'); await senaObs('encenderMotores'); A.motor = true; await esperarQue(() => A.rpm > 0.95); await esperar(1.5);
  decir('Motor estabilizado: «retirar calzas».'); await senaObs('retirarCalzas'); await tutorIrA(enAvion(-1.3, 0, -2.3)); ponerCalzas(false); audio.ok(); tutorAlAla(); await esperar(2.5);
  decir('«Todo despejado»: el señalero confirma que no hay obstáculos.'); await senaObs('todoDespejado', 3.5);
  decir('«Avanzar».'); await senaObs('avanzar'); moverAvion(12, 2); await esperarQue(() => A.s >= 11.6);
  decir('«Giro a la derecha», hacia la pista.'); await senaObs('giroDerecha'); moverAvion(21.4, 1.5); await esperarQue(() => A.s >= 21);
  decir('«Avanzar» y el avión sale hacia la pista. El compañero de punta de ala acompaña hasta que el ala queda libre de obstáculos.'); await senaObs('avanzar'); moverAvion(SALIDA.largo, 3);
  await esperar(5); senalero.userData.hacer('saludo'); rotulo('Señalero: despedida'); await esperar(4);
  return await preguntar('Salida observada', 'Ahora te toca a vos. Primero te vas a poner el equipo de protección.', [{ id: 'equipo', texto: 'Continuar' }, { id: 'obsSalida', texto: 'Repetir', secundario: true }]);
}

async function equipo() {
  reiniciarMundo(); faseTitulo('3 · Equipo de protección'); senalero.visible = false;
  ponerAvion(LLEGADA, 0); A.motor = true; A.rpm = 1; tutor.position.copy(mesaEPP.position).add(new THREE.Vector3(2.6, 0, -1.6)); T.modo = 'quieto';
  teletransportar(mesaEPP.position.x + 0.2, mesaEPP.position.z + 1.6, mesaEPP.position); camara.rotation.x = -0.45; pitch = -0.45; camara.rotation.set(pitch, yaw, 0, 'YXZ');
  Object.keys(epp).forEach(k => epp[k] = false); const items = mesaEPP.userData.items; Object.values(items).forEach(o => o.visible = true);
  const lista = () => tareas([['Chaleco reflectivo', epp.chaleco], ['Protectores auditivos', epp.protectores], ['Paletas (señalizadores)', epp.paletas]]); lista();
  decir('Antes de salir a la plataforma te ponés el equipo: chaleco reflectivo, protectores auditivos y paletas. Tocá cada cosa en la mesa.');
  const textos = { chaleco: 'Chaleco puesto: el piloto y los vehículos te ven de lejos.', protectores: 'Protectores puestos: el ruido de la turbina daña el oído. Notás cómo baja el sonido.', paletas: 'Paletas en la mano. En Quest, los controles ahora son tus paletas.' };
  interactivos = Object.entries(items).map(([k, obj]) => ({ obj, alcanceExtra: 1, alTocar: it => { epp[k] = true; obj.visible = false; audio.ok(); decir(textos[k]); lista(); interactivos = interactivos.filter(x => x !== it); } }));
  await esperarQue(() => epp.chaleco && epp.protectores && epp.paletas); await esperar(2.5); interactivos = []; tareas(null);
  return 'protLlegada';
}

async function protLlegada() {
  reiniciarMundo(); faseTitulo('4 · Guiá la llegada'); senalero.visible = false; Object.keys(epp).forEach(k => epp[k] = true); Object.values(mesaEPP.userData.items).forEach(o => o.visible = false);
  ponerAvion(LLEGADA, 0); A.motor = true; A.rpm = 1; tutorAlAlaYa(); RES.inicio = performance.now(); errores = []; RES.errLlegada = null; RES.parada = null; RES.reaccion = null;
  teletransportar(mesaEPP.position.x + 0.5, mesaEPP.position.z + 1.8, POS_SENALERO); puedeCaminar = true;
  // 1) FOD en el puesto
  sembrarFOD([['tornillo', 0.8, 5], ['trapo', -2.4, -0.5], ['lata', 1.5, -7.5], ['botella', -0.6, -14]]);
  const lista = () => tareas([[`Revisar el puesto: FOD (${fods.filter(f => !f.visible).length}/${fods.length})`, fods.every(f => !f.visible)], ['Pararte en la marca S (32 m)', false], ['Guiar al avión hasta la barra de parada', false], ['Armar el diamante de seguridad', false]]);
  lista();
  decir('El AT-802 está por llegar al puesto P3. Antes, caminá el puesto y levantá todo el FOD que encuentres sobre la línea amarilla. Hay cuatro objetos. Tocá cada uno cuando estés cerca.');
  interactivos = fods.map(f => ({ obj: f, alTocar: it => { f.visible = false; audio.ok(); interactivos = interactivos.filter(x => x !== it); lista(); const q = fods.filter(x => x.visible).length; decir(q ? `Bien. Quedan ${q}.` : 'Puesto limpio. Ahora andá a la marca S.', { hablar: !q }); } }));
  await esperarQue(() => fods.every(f => !f.visible)); interactivos = [];
  // 2) posición
  tareas([['Revisar el puesto: FOD', true], ['Pararte en la marca S (32 m)', false], ['Guiar al avión hasta la barra de parada', false], ['Armar el diamante de seguridad', false]]);
  decir('Andá a la marca S, a 32 metros de donde va a quedar la nariz. Desde ahí el piloto te ve todo el tiempo. Mirá hacia el avión.');
  await esperarQue(() => posAlumno().distanceTo(POS_SENALERO) < 1.4);
  const fijar = () => tareas([['Revisar el puesto: FOD', true], ['Pararte en la marca S (32 m)', true], ['Guiar al avión hasta la barra de parada', false], ['Armar el diamante de seguridad', false]]); fijar();
  const pos = vigilarPosicion(); const vigilar = () => pos();
  mostrarMenuSenas(true);
  const paso = async (id, texto) => { if (texto) decir(texto); await esperarSena(id); };
  await paso('saludo', 'El avión te vio. Saludá al piloto.' + (renderer.xr.isPresenting ? ' (Si no te toma la seña, apretá A o X para elegirla en el menú.)' : ''));
  await paso('posicion', 'Indicale que este es su puesto.');
  await paso('avanzar', 'Hacé que avance por la calle de rodaje.'); moverAvion(17, 2.2);
  await esperarQue(() => { vigilar(); return A.s >= 16.6 && A.v < 0.05; });
  await paso('giroDerecha', 'Tiene que girar hacia el puesto. Ojo: derecha e izquierda son las del piloto.'); moverAvion(29.4, 1.5);
  await esperarQue(() => { vigilar(); return A.s >= 29.3 && A.v < 0.05; });
  await paso('avanzar', 'Que avance derecho hacia vos.'); moverAvion(36, 1.8);
  await esperarQue(() => { vigilar(); return A.s >= 31; });
  // 3) imprevisto: incursión de la Hilux
  decir('¡Atención!'); let tCruce = 0, reacciono = false; const cruce = cruceHilux(() => { tCruce = performance.now(); });
  const resp = esperarSena(['paradaEmergencia'], { pista: 99 }).then(() => { reacciono = true; RES.reaccion = tCruce ? (performance.now() - tCruce) / 1000 : 0; pararAvion(true); decir('¡Bien! Parada de emergencia a tiempo.'); });
  await esperarQue(() => reacciono || (tCruce && performance.now() - tCruce > 4500));
  if (!reacciono) { esperada = null; pararAvion(true); registrarError('No diste la parada de emergencia ante el vehículo'); decir('¡El vehículo cruzó delante del avión! Correspondía «parada de emergencia» enseguida. Esta vez el piloto lo vio y frenó solo.'); resp.catch(() => { }); }
  await cruce; await esperar(0.8);
  await paso('avanzar', 'La zona quedó libre. Indicale que continúe.'); moverAvion(36, 1.6);
  await esperarQue(() => { vigilar(); return A.s >= 35.9 && A.v < 0.05; });
  await paso('bajarVelocidad', 'Está cerca de la barra de parada. Que baje la velocidad.'); moverAvion(PARADA + 1.2, 0.6);
  // 4) parada: hay que darla en el momento justo
  decir('Dale «parada normal» cuando las ruedas principales lleguen a la barra amarilla.', { hablar: true });
  let paro = false; esperarSena('paradaNormal', { pista: 99 }).then(() => { paro = true; pararAvion(false); }).catch(() => { });
  await esperarQue(() => { vigilar(); return paro || A.s >= PARADA + 1.1; });
  if (!paro) { esperada = null; pararAvion(true); registrarError('El avión se pasó de la barra de parada'); decir('Se pasó de la barra: la parada llegó tarde. El piloto frenó solo.'); }
  await esperarQue(() => A.v < 0.02); RES.parada = Math.abs(A.s - PARADA);
  if (paro && A.s < PARADA - 1.5) registrarError(`Parada anticipada: el avión quedó a ${RES.parada.toFixed(1)} m antes de la barra`);
  if (paro) decir(RES.parada < 0.5 ? `Excelente parada: a ${RES.parada.toFixed(1)} m de la barra.` : `Paró a ${RES.parada.toFixed(1)} m de la barra. Con práctica, más justo.`);
  await esperar(2.5);
  await paso('colocarCalzas', 'Avión detenido. Indicale que se colocan las calzas.'); T.modo = 'ir'; await tutorIrA(enAvion(-1.3, 0, -2.3)); ponerCalzas(true); audio.ok(); tutorAlAla();
  await paso('detenerMotores', 'Calzas puestas. Ahora, que detenga el motor.'); A.motor = false; mostrarMenuSenas(false); rotulo('');
  // 5) diamante
  tareas([['Revisar el puesto: FOD', true], ['Pararte en la marca S (32 m)', true], ['Guiar al avión hasta la barra de parada', true], ['Armar el diamante de seguridad (0/5)', false]]);
  await esperarQue(() => A.rpm < 0.15);
  decir('Motor detenido. Armá el diamante de seguridad: caminá hasta cada cono transparente y tocalo para colocarlo. Nariz, puntas de ala y dos en la cola.');
  ubicarConos(); let puestos = 0; fantasmas.forEach(f => f.visible = true);
  interactivos = fantasmas.map((f, i) => ({ obj: f, alTocar: it => { f.visible = false; conos[i].visible = true; puestos++; audio.ok(); interactivos = interactivos.filter(x => x !== it);
    tareas([['Revisar el puesto: FOD', true], ['Pararte en la marca S (32 m)', true], ['Guiar al avión hasta la barra de parada', true], [`Armar el diamante de seguridad (${puestos}/5)`, puestos === 5]]); } }));
  await esperarQue(() => puestos === 5); interactivos = []; decir('Diamante armado. ¡Llegada completa!'); await esperar(3);
  RES.errLlegada = errores.length;
  return await preguntar('Llegada guiada', `Errores: ${errores.length}.` + (RES.parada != null ? `\nParada a ${RES.parada.toFixed(1)} m de la barra.` : '') + (RES.reaccion != null ? `\nReacción ante el vehículo: ${RES.reaccion.toFixed(1)} s.` : '\nNo reaccionaste ante el vehículo.'), [{ id: 'protSalida', texto: 'Continuar: guiar la salida' }, { id: 'protLlegada', texto: 'Repetir', secundario: true }]);
}

async function protSalida() {
  const previos = errores.slice(); reiniciarMundo(); errores = previos; faseTitulo('5 · Guiá la salida'); senalero.visible = false; Object.keys(epp).forEach(k => epp[k] = true); Object.values(mesaEPP.userData.items).forEach(o => o.visible = false);
  ponerAvion(SALIDA, 0); A.motor = false; A.rpm = 0; ponerCalzas(true); ubicarConos(); conos.forEach(c => c.visible = true); if (!RES.inicio) RES.inicio = performance.now();
  teletransportar(PUESTO.x - 4, PUESTO.z - 9, enAvion(0, 0, 0)); puedeCaminar = true;
  const estado = { fod: false, conos: false, pos: false, salida: false };
  const lista = () => tareas([['Control de FOD en el recorrido', estado.fod], ['Retirar el diamante (conos)', estado.conos], ['Pararte en la marca S', estado.pos], ['Encendido y salida', estado.salida]]); lista();
  sembrarFOD([['piedra', 3, -10], ['precinto', -1.2, -12.5], ['tornillo', 6.5, -19], ['trapo', 12, -20.5]]);
  decir('El avión va a salir hacia la pista: recto hacia la marca S y después a la derecha, por la línea amarilla. Revisá ese recorrido y levantá el FOD. Son cuatro objetos.');
  interactivos = fods.map(f => ({ obj: f, alTocar: it => { f.visible = false; audio.ok(); interactivos = interactivos.filter(x => x !== it); const q = fods.filter(x => x.visible).length; if (!q) { estado.fod = true; lista(); } decir(q ? `Bien. Quedan ${q}.` : 'Recorrido limpio.', { hablar: !q }); } }));
  await esperarQue(() => estado.fod);
  decir('Ahora retirá los conos del diamante: tocá cada uno.');
  interactivos = conos.map(c => ({ obj: c, alTocar: it => { c.visible = false; audio.aviso(); interactivos = interactivos.filter(x => x !== it); if (conos.every(x => !x.visible)) { estado.conos = true; lista(); } } }));
  await esperarQue(() => estado.conos); interactivos = [];
  decir('Andá a la marca S y mirá al avión.');
  // el compañero se queda revisando delante de la hélice: el alumno tiene que esperar a que se aleje
  T.modo = 'ir'; tutorIrA(enAvion(4.2, 0, 0.8), 1.2).catch(() => { });
  await esperarQue(() => posAlumno().distanceTo(POS_SENALERO) < 1.4); estado.pos = true; lista();
  const pos = vigilarPosicion(); mostrarMenuSenas(true);
  let tutorSeFue = false; esperar(9).then(async () => { decir('Listo, terminé de revisar adelante. Me voy a la punta del ala.', { hablar: true }); tutorAlAla(); await esperar(3); tutorSeFue = true; }).catch(() => { });
  decir('Tu compañero está revisando delante de la hélice. El encendido se da sólo con la zona de la hélice libre.');
  // encendido: si lo pide con alguien en la zona de la hélice, error grave y no enciende
  for (;;) { await esperarSena('encenderMotores'); if (tutorSeFue) break;
    registrarError('Pediste encender con una persona en la zona de la hélice'); audio.mal(); decir('¡No! Hay una persona delante de la hélice. Nunca des el encendido con alguien en esa zona. Esperá a que se aleje.'); await esperarQue(() => tutorSeFue); decir('Ahora sí, la zona está libre.'); }
  A.motor = true; await esperarQue(() => A.rpm > 0.95);
  const paso = async (id, texto) => { if (texto) decir(texto); await esperarSena(id); };
  await paso('retirarCalzas', 'Motor estabilizado. Indicale que se retiran las calzas.'); await tutorIrA(enAvion(-1.3, 0, -2.3)); ponerCalzas(false); audio.ok(); tutorAlAla(); await esperar(2);
  await paso('todoDespejado', 'Confirmale que no hay obstáculos.');
  await paso('avanzar', 'Que avance hacia vos.'); moverAvion(12, 2); await esperarQue(() => { pos(); return A.s >= 11.8 && A.v < 0.05; });
  await paso('giroDerecha', 'Tiene que girar hacia la pista.'); moverAvion(21.4, 1.5); await esperarQue(() => { pos(); return A.s >= 21.3 && A.v < 0.05; });
  await paso('avanzar', 'Despedilo: que siga hacia la pista.'); moverAvion(SALIDA.largo, 3); estado.salida = true; lista(); mostrarMenuSenas(false);
  decir('¡Salida completa! El piloto sigue por su cuenta hacia la pista.'); await esperar(6);
  return 'resultado';
}

const constancia = new Constancia(); escena.add(constancia.mesh);
const nota = n => Math.max(0, 100 - 15 * n);
async function resultado() {
  faseTitulo('Resultado'); mostrarMenuSenas(false); tareas(null); puedeCaminar = false; senalero.visible = false; rotulo('');
  const eL = RES.errLlegada ?? errores.length, eS = Math.max(0, errores.length - eL);
  const etapas = [{ nombre: 'Guía de la llegada', nota: nota(eL), detalle: `${eL} error(es)` + (RES.parada != null ? ` · parada a ${RES.parada.toFixed(1)} m` : '') + (RES.reaccion != null ? ` · reacción ${RES.reaccion.toFixed(1)} s` : '') },
    { nombre: 'Guía de la salida', nota: nota(eS), detalle: `${eS} error(es)` }];
  const prom = Math.round((etapas[0].nota + etapas[1].nota) / 2);
  const titulo = prom >= 85 ? 'Excelente' : prom >= 70 ? 'Aprobado' : 'A practicar';
  const detalle = errores.length ? '\n\nPara revisar:\n• ' + [...new Set(errores)].slice(0, 5).join('\n• ') : '';
  decir(`${titulo}. Terminaste las dos maniobras con ${errores.length} ${errores.length === 1 ? 'error' : 'errores'}.`);
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let nombre = ''; try { nombre = localStorage.getItem('senales-nombre') || ''; } catch { }
  const datos = () => ({ nombre, etapas, fecha });
  if (renderer.xr.isPresenting) { constancia.mostrar(datos()); const p = new THREE.Vector3(), q = new THREE.Quaternion(); camara.getWorldPosition(p); camara.getWorldQuaternion(q);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q); f.y = 0; f.normalize(); constancia.mesh.position.copy(p).addScaledVector(f, 2.2).add(new THREE.Vector3(0, 0.35, 0)); constancia.mesh.lookAt(p.x, constancia.mesh.position.y, p.z); }
  $('nombre-cert').hidden = false; $('nombre-input').value = nombre;
  for (;;) {
    const r = await preguntar(`${titulo} · promedio ${prom}/100`, `Llegada: ${etapas[0].nota}/100 · Salida: ${etapas[1].nota}/100. Tiempo: ${((performance.now() - (RES.inicio || performance.now())) / 60000).toFixed(1)} min.` + detalle,
      [{ id: 'cert', texto: 'Descargar certificado' }, { id: 'intro', texto: 'Volver a empezar', secundario: true }, { id: 'protLlegada', texto: 'Repetir la práctica', secundario: true }]);
    nombre = $('nombre-input').value.trim(); try { localStorage.setItem('senales-nombre', nombre); } catch { }
    if (r !== 'cert') { $('nombre-cert').hidden = true; constancia.ocultar(); return r; }
    constancia.dibujar(datos()); constancia.descargar();
  }
}

const FASES = { intro, obsLlegada, obsSalida, equipo, protLlegada, protSalida, resultado };
let faseActual = 'intro';
async function correr(nombre) {
  for (;;) { corrida++; faseActual = nombre; const tok = corrida;
    try { const sig = await FASES[nombre](); if (tok !== corrida) return; nombre = sig || 'intro'; if (nombre === 'protLlegada') RES.inicio = 0; }
    catch (e) { if (e instanceof Corte) return; console.error(e); return; } }
}
function irA(nombre) { esperada = null; alResolver = null; $('panel').hidden = true; panelVR.ocultar(); correr(nombre); }
$('menu').onclick = () => irA('intro');

// ---------- bucle
const reloj = new THREE.Clock(); let velJuego = 1;   // (sólo para pruebas)
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.05) * velJuego; dtActual = dt;
  ambiente.actualizar(dt); actualizarAvion(dt); mirarAvion(senalero); senalero.userData.actualizar(dt); actualizarTutor(dt);
  if (renderer.xr.isPresenting) actualizarVR(dt); else moverPC(dt);
  revisarPista(dt); revisarVigilantes();
  renderer.setScissorTest(false); renderer.render(escena, camara);
  if (prevVisible && !renderer.xr.isPresenting) { preview.userData.actualizar(dt); const w = Math.min(170, innerWidth * 0.3), h = w * 1.33, x = innerWidth - w - 12, y = (contSenas.hidden ? 12 : 70);
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true); renderer.autoClear = false; renderer.clearDepth(); renderer.render(escenaPrev, camPrev); renderer.autoClear = true; renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); }
});
addEventListener('resize', () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.__senales = { constancia, set vel(v) { velJuego = v; }, get esperada() { return esperada; }, A, avion, senalero, tutor, irA, sena: id => senaDelAlumno(id), get fase() { return faseActual; }, fods: () => fods, conos, fantasmas, teletransportar, rig, camara, epp, mesaEPP, tocarObj: o => { const it = interactivos.find(i => i.obj === o); if (it) it.alTocar(it); }, interactivos: () => interactivos, errores: () => errores, POS_SENALERO, detector, RES, panel: id => { const b = [...document.querySelectorAll('#panel-botones button')].find(x => x.textContent.includes(id)); b?.click(); } };
correr('intro');
