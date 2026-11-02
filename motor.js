/* Brújula 29N — motor de cálculo.
 * Misma fórmula que scripts/construir.py (se comprueba automáticamente).
 * Funciona en el navegador (window.Motor) y en Node (module.exports).
 */
(function (global) {
  "use strict";

  // Acuerdo en una pregunta: 1 si piensan igual, 0 si piensan lo opuesto.
  function acuerdo(u, p) { return 1 - Math.abs(u - p) / 4; }

  // Acuerdo que tendría alguien respondiendo al azar (−2..+2 con igual probabilidad).
  var AZAR = {};
  [-2, -1, 0, 1, 2].forEach(function (p) {
    var s = 0;
    [-2, -1, 0, 1, 2].forEach(function (u) { s += acuerdo(u, p); });
    AZAR[p] = s / 5;
  });

  // Coincidencia de cada partido, de 0 a 100 (50 = lo mismo que respondiendo al azar),
  // ya corregida por casillas vacías.
  // respuestas: { idPropuesta: { v: -2..2 o null ("no lo sé"), imp: true/false } }
  function puntuar(datos, respuestas, k, subset) {
    var K = k == null ? datos.parametros.k : k;
    var props = subset || datos.propuestas;
    return datos.partidos.map(function (partido) {
      var s = 0, wsum = 0, n = 0;
      for (var i = 0; i < props.length; i++) {
        var q = props[i];
        var r = respuestas[q.id];
        var p = q.posturas[partido.id] ? q.posturas[partido.id].v : null;
        if (!r || r.v == null || p == null) continue;
        var w = r.imp ? 2 : 1;
        s += w * (acuerdo(r.v, p) - AZAR[p]) / (1 - AZAR[p]);
        wsum += w;
        n += 1;
      }
      var bruto = wsum > 0 ? 50 + (50 * s) / wsum : 50;
      return { id: partido.id, bruto: bruto, ajustado: (n * bruto + K * 50) / (n + K), n: n };
    });
  }

  // Generador pseudoaleatorio con semilla (mismo resultado cada vez para las mismas respuestas).
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function semillaDe(respuestas) {
    var txt = JSON.stringify(respuestas), h = 2166136261;
    for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Bootstrap: repite el cálculo B veces remuestreando las preguntas respondidas.
  // Devuelve, para cada partido, la proporción de repeticiones en las que queda primero.
  function estabilidad(datos, respuestas, B) {
    B = B || datos.parametros.bootstrap;
    var rnd = mulberry32(semillaDe(respuestas));
    var respondidas = datos.propuestas.filter(function (q) {
      return respuestas[q.id] && respuestas[q.id].v != null;
    });
    var J = datos.partidos.length, gana = new Array(J).fill(0);
    if (!respondidas.length) return gana;
    for (var b = 0; b < B; b++) {
      var muestra = [];
      for (var i = 0; i < respondidas.length; i++) {
        muestra.push(respondidas[Math.floor(rnd() * respondidas.length)]);
      }
      var res = puntuar(datos, respuestas, null, muestra);
      var mejor = 0;
      for (var j = 1; j < J; j++) {
        if (res[j].ajustado > res[mejor].ajustado ||
            (res[j].ajustado === res[mejor].ajustado && rnd() < 0.5)) mejor = j;
      }
      gana[mejor] += 1;
    }
    return gana.map(function (g) { return g / B; });
  }

  var Motor = { puntuar: puntuar, estabilidad: estabilidad };
  if (typeof module !== "undefined" && module.exports) module.exports = Motor;
  else global.Motor = Motor;
})(typeof window !== "undefined" ? window : this);
