// Sonidos sintetizados (sin archivos): turbina, celular, radio, aviso. Posicionales con Three.js.
import * as THREE from './three.module.js';

function buffer(ctx, seg, fn) {
  const n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = fn(i / ctx.sampleRate, i);
  return b;
}

export function crearAudio(camara) {
  const oyente = new THREE.AudioListener(); camara.add(oyente);
  const ctx = oyente.context;
  const sr = ctx.sampleRate;

  // Turbina: ruido rosa filtrado + silbido; loop de 2 s sin corte
  let b0 = 0, b1 = 0, b2 = 0;
  const turbina = buffer(ctx, 2, (t) => {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
    const rosa = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    const silbido = Math.sin(2 * Math.PI * 1850 * t) * 0.05 + Math.sin(2 * Math.PI * 3700 * t) * 0.015;
    const helice = Math.sin(2 * Math.PI * 95 * t) * 0.12 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 17.5 * t));
    return rosa + silbido + helice;
  });
  // Celular: dos tonos alternados, 1 s sonando y 1 s de silencio
  const celular = buffer(ctx, 2, t => {
    if (t > 1) return 0;
    const f = (Math.floor(t * 8) % 2) ? 1320 : 990;
    return Math.sin(2 * Math.PI * f * t) * 0.35 * (Math.sin(Math.PI * (t * 8 % 1)) > 0.1 ? 1 : 0);
  });
  // Radio: chirrido + estática entrecortada
  const radio = buffer(ctx, 2.2, t => {
    if (t < 0.12) return Math.sin(2 * Math.PI * (1200 + 600 * t / 0.12) * t) * 0.3;
    if (t > 1.6) return 0;
    const habla = Math.sin(2 * Math.PI * 4 * t) > -0.3 ? 1 : 0.2;
    return (Math.random() * 2 - 1) * 0.12 * habla + Math.sin(2 * Math.PI * 310 * t) * Math.sin(2 * Math.PI * 7 * t) * 0.12 * habla;
  });
  const aviso = buffer(ctx, 0.25, t => Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 14) * 0.5);
  const ok = buffer(ctx, 0.4, t => (Math.sin(2 * Math.PI * (t < 0.12 ? 660 : 990) * t)) * Math.exp(-t * 6) * 0.4);
  const mal = buffer(ctx, 0.35, t => Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 5) * 0.45);
  void sr;

  const fuentes = [];
  function posicional(obj, buf, { loop = false, volumen = 1, ref = 3 } = {}) {
    const s = new THREE.PositionalAudio(oyente);
    s.setBuffer(buf); s.setLoop(loop); s.setVolume(volumen); s.setRefDistance(ref); s.setRolloffFactor(1.4);
    obj.add(s); fuentes.push(s); return s;
  }
  function plano(buf, volumen = 0.6) {
    const s = new THREE.Audio(oyente); s.setBuffer(buf); s.setVolume(volumen); s.play(); return s;
  }
  return {
    oyente,
    buffers: { turbina, celular, radio },
    posicional,
    reanudar: () => ctx.state === 'suspended' && ctx.resume(),
    aviso: () => plano(aviso, 0.5), ok: () => plano(ok, 0.5), mal: () => plano(mal, 0.5),
    silenciar: () => fuentes.forEach(f => f.isPlaying && f.stop()),
  };
}
