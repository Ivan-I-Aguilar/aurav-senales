# AURAV · Señaleros de plataforma

Juego de realidad virtual (WebXR, Meta Quest 3S; también PC y celular) para el curso de **Personal de Rampa** de AAXOD:
las 12 señas de señalero, guía de salida y llegada de un AT-802 entre aviones estacionados, diamante de seguridad,
encendido de motor, control de FOD, equipamiento de seguridad e imprevistos.

**Contenido:** lámina «Tipos de señales / Curso Personal de Rampa – AAXOD SA». Lo que el curso no detalla queda «a validar».
Prototipo de demostración. **Versión 1: juego completo.**

## Cómo se juega
1. **Observar la llegada** — un señalero 3D guía al AT-802 desde la calle de rodaje hasta el puesto P3 (incluye la incursión de una camioneta y la parada de emergencia). Se puede mirar desde la cabina.
2. **Observar la salida** — FOD, retiro de conos, encendido seguro, calzas y salida hacia la pista.
3. **Equipo de protección** — chaleco, protectores auditivos y paletas.
4. **Guiar la llegada** — controlar el FOD, pararse en la marca S (32 m de la nariz), hacer las señas, reaccionar ante el vehículo, parar sobre la barra, calzas, detener motor y armar el diamante de seguridad.
5. **Guiar la salida** — FOD en el recorrido, retirar el diamante, esperar a que la zona de la hélice esté libre, encendido, calzas, todo despejado, avanzar y giro.
6. **Resultado y certificado** (logo AAXOD, descarga en PNG).

En **Quest** los controles son las paletas: las señas se reconocen por la posición de las manos (botón A/X abre un menú de respaldo). Stick izquierdo para caminar, derecho para girar, gatillo para tocar objetos.
En **PC/celular**: arrastrar para mirar, WASD o tocar el piso para caminar, y las señas en el menú de abajo.

Secuencias, saludo, indicar posición, calzas y la distancia de 32 m: según OACI / AAXOD, **a validar**.

## Modelos
- Señalero: generado con Tripo (texto a 3D + auto-rig Mixamo) para AURAV; esqueleto y pesos corregidos por código.
- Avión (y su versión liviana `at802-lod.glb` para los 4 estacionados), escenario, texturas, motobomba, autobomba y camioneta: los mismos de `aurav-sector` (créditos en ese repo).
- Logo AAXOD: provisto por AAXOD para el certificado.
