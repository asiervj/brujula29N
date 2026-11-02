/* Brújula 29N — interfaz. Las respuestas solo viven en esta variable: no se guardan ni se envían. */
(function () {
  "use strict";

  var D = window.BRUJULA_DATA;
  var app = document.getElementById("app");
  var ESCALA = [
    { v: -2, t: "Muy en contra" },
    { v: -1, t: "En contra" },
    { v: 0, t: "Neutral" },
    { v: 1, t: "A favor" },
    { v: 2, t: "Muy a favor" }
  ];
  var NOMBRE = {};
  D.partidos.forEach(function (p) { NOMBRE[p.id] = p.nombre; });

  var estado = nuevoEstado();

  function nuevoEstado() {
    return { orden: barajar(D.propuestas), idx: 0, resp: {}, imp: {}, filtroTema: "", resaltar: "" };
  }

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pct(x) { return Math.round(x) + " %"; }
  function etiqueta(v) {
    for (var i = 0; i < ESCALA.length; i++) if (ESCALA[i].v === v) return ESCALA[i].t;
    return "";
  }

  // Orden aleatorio para cada persona, evitando dos preguntas seguidas del mismo tema.
  function barajar(lista) {
    var resto = lista.slice(), salida = [];
    while (resto.length) {
      var ultimo = salida.length ? salida[salida.length - 1].tema : null;
      var candidatos = resto.filter(function (q) { return q.tema !== ultimo; });
      if (!candidatos.length) candidatos = resto;
      var elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
      salida.push(elegido);
      resto.splice(resto.indexOf(elegido), 1);
    }
    return salida;
  }

  function validas() {
    return D.propuestas.filter(function (q) {
      return estado.resp[q.id] && estado.resp[q.id].v != null;
    }).length;
  }

  // ---------- rutas ----------
  function ir(ruta) { if (location.hash !== ruta) location.hash = ruta; else render(); }
  window.addEventListener("hashchange", render);

  function render() {
    var ruta = location.hash.replace(/^#/, "") || "/";
    document.removeEventListener("keydown", teclas);
    if (ruta === "/test") pintarTest();
    else if (ruta === "/resultados") pintarResultados();
    else if (ruta === "/metodologia") pintarMetodologia();
    else pintarInicio();
    window.scrollTo(0, 0);
  }

  // ---------- inicio ----------
  function pintarInicio() {
    var c = D.config;
    var muestra = D.propuestas[Math.floor(Math.random() * D.propuestas.length)];
    app.innerHTML =
      '<section class="portada">' +
      "<h1>" + esc(c.titulo) + "</h1>" +
      '<p class="tenue">' + esc(c.subtitulo) + " " + esc(c.eleccion) + ".</p>" +
      '<figure class="muestra">' +
      '<p class="cita">' + esc(muestra.texto) + "</p>" +
      '<figcaption class="pregunta-autor">¿De qué partido es? Lo verás al final.</figcaption>' +
      "</figure>" +
      '<ol class="pasos">' +
      "<li>Lees " + D.propuestas.length + " propuestas copiadas tal cual de los programas, " +
      D.propuestas.length / D.partidos.length + " de cada partido, sin saber de quién son.</li>" +
      "<li>Dices si estás a favor o en contra de cada una. Unos 7 minutos.</li>" +
      "<li>Ves con qué partido coincides más y, pregunta a pregunta, qué opina cada uno.</li>" +
      "</ol>" +
      '<div class="fila-botones">' +
      '<button class="boton" id="empezar">Empezar el test</button>' +
      '<a href="#/metodologia">Cómo funciona y pruebas de neutralidad</a>' +
      "</div></section>";
    document.getElementById("empezar").onclick = function () {
      if (Object.keys(estado.resp).length) estado = nuevoEstado();
      ir("#/test");
    };
  }

  // ---------- test ----------
  function pintarTest() {
    var total = estado.orden.length;
    if (estado.idx >= total) return ir("#/resultados");
    var q = estado.orden[estado.idx];
    var r = estado.resp[q.id];
    var imp = !!estado.imp[q.id];

    var botones = ESCALA.map(function (o) {
      var on = r && r.v === o.v;
      return '<button class="opcion" data-v="' + o.v + '" aria-pressed="' + on + '">' +
        '<span class="punto" aria-hidden="true"></span>' + o.t + "</button>";
    }).join("");

    app.innerHTML =
      '<div class="progreso"><span>Pregunta ' + (estado.idx + 1) + " de " + total + "</span>" +
      "<span>" + esc(q.tema) + "</span></div>" +
      '<div class="barra-progreso" aria-hidden="true"><span style="width:' + (100 * estado.idx / total) + '%"></span></div>' +
      '<div class="tarjeta-pregunta"><p class="tema">¿Qué te parece esta propuesta?</p>' +
      '<p class="cita" id="texto-propuesta" tabindex="-1">' + esc(q.texto) + "</p></div>" +
      '<div class="escala" role="group" aria-labelledby="texto-propuesta">' + botones + "</div>" +
      '<div class="extras">' +
      '<button class="no-se" aria-pressed="' + !!(r && r.v == null) + '">No lo sé / no lo entiendo</button>' +
      '<label class="importa"><input type="checkbox" id="imp"' + (imp ? " checked" : "") + "> Esto me importa mucho</label>" +
      "</div>" +
      '<div class="navegacion">' +
      (estado.idx > 0 ? '<button class="boton-texto" id="atras">Anterior</button>' : "<span></span>") +
      (r ? '<button class="boton-texto" id="siguiente">Siguiente</button>' : "") +
      "</div>" +
      '<p class="atajos tenue peq">Atajos: teclas 1 a 5 para responder, 0 para «no lo sé», flecha izquierda para volver.</p>';

    app.querySelectorAll(".opcion").forEach(function (b) {
      b.onclick = function () { responder(q, Number(b.getAttribute("data-v"))); };
    });
    app.querySelector(".no-se").onclick = function () { responder(q, null); };
    document.getElementById("imp").onchange = function (e) {
      estado.imp[q.id] = e.target.checked;
      if (estado.resp[q.id]) estado.resp[q.id].imp = e.target.checked;
    };
    var atras = document.getElementById("atras");
    if (atras) atras.onclick = function () { estado.idx--; pintarTest(); };
    var sig = document.getElementById("siguiente");
    if (sig) sig.onclick = function () { avanzar(); };
    document.addEventListener("keydown", teclas);
    document.getElementById("texto-propuesta").focus({ preventScroll: true });
  }

  var avanzando = false;
  function responder(q, v) {
    if (avanzando) return;
    avanzando = true;
    estado.resp[q.id] = { v: v, imp: !!estado.imp[q.id] };
    app.querySelectorAll(".opcion").forEach(function (b) {
      b.setAttribute("aria-pressed", String(v !== null && Number(b.getAttribute("data-v")) === v));
    });
    app.querySelector(".no-se").setAttribute("aria-pressed", String(v === null));
    setTimeout(avanzar, 220);
  }

  function avanzar() {
    avanzando = false;
    estado.idx++;
    if (estado.idx >= estado.orden.length) ir("#/resultados");
    else { pintarTest(); window.scrollTo(0, 0); }
  }

  function teclas(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var q = estado.orden[estado.idx];
    if (!q) return;
    if (e.key >= "1" && e.key <= "5") responder(q, Number(e.key) - 3);
    else if (e.key === "0") responder(q, null);
    else if (e.key === "ArrowLeft" && estado.idx > 0) { estado.idx--; pintarTest(); }
  }

  // ---------- resultados ----------
  function pintarResultados() {
    var n = validas(), min = D.config.min_respuestas;
    if (!Object.keys(estado.resp).length) return ir("#/");
    if (n < min) {
      app.innerHTML = "<h1>Faltan respuestas</h1>" +
        "<p>Has respondido " + n + " propuestas con una opinión. Para dar un resultado fiable hacen falta al menos " + min +
        ". Puedes volver atrás y cambiar algunas de las que marcaste como «no lo sé».</p>" +
        '<div class="fila-botones"><button class="boton" id="revisar">Volver a las preguntas</button>' +
        '<button class="boton secundario" id="reiniciar">Empezar de nuevo</button></div>';
      document.getElementById("revisar").onclick = function () { estado.idx = 0; ir("#/test"); };
      document.getElementById("reiniciar").onclick = function () { estado = nuevoEstado(); ir("#/test"); };
      return;
    }

    var res = Motor.puntuar(D, estado.resp);
    var cuotas = Motor.estabilidad(D, estado.resp);
    res.forEach(function (r, i) { r.cuota = cuotas[i]; });
    var orden = res.slice().sort(function (a, b) { return b.ajustado - a.ajustado; });
    var primero = orden[0], segundo = orden[1];
    var umbral = D.parametros.umbral_empate;

    var titular = primero.cuota >= umbral
      ? "<strong>Coincides más con " + esc(NOMBRE[primero.id]) + ".</strong>" +
        '<p class="peq tenue" style="margin:0.4rem 0 0">Es un resultado estable: al repetir el cálculo 1.000 veces con distintas combinaciones de tus respuestas, ' +
        esc(NOMBRE[primero.id]) + " queda primero en el " + pct(100 * primero.cuota) + " de los casos.</p>"
      : "<strong>Empate técnico entre " + esc(NOMBRE[primero.id]) + " y " + esc(NOMBRE[segundo.id]) + ".</strong>" +
        '<p class="peq tenue" style="margin:0.4rem 0 0">' + esc(NOMBRE[primero.id]) + " sale primero, pero al repetir el cálculo 1.000 veces con distintas combinaciones de tus respuestas solo queda primero en el " +
        pct(100 * primero.cuota) + " de los casos. La diferencia depende de muy pocas preguntas.</p>";

    var ranking = orden.map(function (r) {
      return "<li><div class=\"cab\"><span class=\"nombre\">" + esc(NOMBRE[r.id]) + '</span><span class="pct">' + pct(r.ajustado) + "</span></div>" +
        '<div class="barra" role="img" aria-label="' + esc(NOMBRE[r.id]) + ": " + pct(r.ajustado) + ' de coincidencia"><span style="width:' + r.ajustado.toFixed(1) + '%"></span><i class="azar"></i></div>' +
        '<div class="detalle">Comparado en ' + r.n + " de " + D.propuestas.length + " propuestas</div></li>";
    }).join("");

    var temas = [];
    D.propuestas.forEach(function (q) { if (temas.indexOf(q.tema) < 0) temas.push(q.tema); });
    temas.sort(function (a, b) { return a.localeCompare(b, "es"); });

    app.innerHTML =
      "<h1>Tu resultado</h1>" +
      '<div class="estabilidad">' + titular + "</div>" +
      '<ol class="ranking">' + ranking + "</ol>" +
      '<p class="leyenda-azar"><i aria-hidden="true"></i>La raya marca el 50 %: lo que coincidirías con cualquier partido respondiendo al azar.</p>' +
      '<div class="fila-botones"><button class="boton secundario" id="otra-vez">Repetir el test</button>' +
      '<a href="#/metodologia">Cómo se calcula</a></div>' +
      "<h2>Pregunta a pregunta</h2>" +
      "<p>Ahora ves de quién era cada propuesta y qué opina cada partido. Los puntos son las posturas de los partidos según sus programas; el que tiene anillo es el que la propone. La columna resaltada es tu respuesta.</p>" +
      '<div class="filtros">' +
      '<label>Tema<select id="f-tema"><option value="">Todos</option>' +
      temas.map(function (t) { return '<option value="' + esc(t) + '"' + (estado.filtroTema === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") +
      "</select></label>" +
      '<label>Resaltar partido<select id="f-partido"><option value="">Ninguno</option>' +
      D.partidos.map(function (p) { return '<option value="' + esc(p.id) + '"' + (estado.resaltar === p.id ? " selected" : "") + ">" + esc(p.nombre) + "</option>"; }).join("") +
      "</select></label></div>" +
      '<ol class="desglose" id="desglose"></ol>';

    document.getElementById("otra-vez").onclick = function () { estado = nuevoEstado(); ir("#/test"); };
    document.getElementById("f-tema").onchange = function (e) { estado.filtroTema = e.target.value; pintarDesglose(); };
    document.getElementById("f-partido").onchange = function (e) { estado.resaltar = e.target.value; pintarDesglose(); };
    pintarDesglose();
    app.focus({ preventScroll: true });
  }

  function pintarDesglose() {
    var lista = estado.orden.filter(function (q) { return !estado.filtroTema || q.tema === estado.filtroTema; });
    document.getElementById("desglose").innerHTML = lista.map(pintarItem).join("");
  }

  function pintarItem(q) {
    var r = estado.resp[q.id];
    var uv = r ? r.v : undefined;
    var ejes = '<div class="ejes" aria-hidden="true"><span></span>' + ESCALA.map(function (o) {
      return o.v === uv ? '<span style="color:var(--ocre);font-weight:700">' + o.t + "<br>(tú)</span>" : "<span>" + o.t + "</span>";
    }).join("") + "</div>";

    var filas = D.partidos.map(function (p) {
      var po = q.posturas[p.id] || { v: null };
      var cls = "fila" + (p.id === q.autor ? " autor-fila" : "") +
        (estado.resaltar ? (estado.resaltar === p.id ? " resaltada" : " atenuada") : "");
      var dentro;
      if (po.v == null) {
        dentro = '<span class="silencio">No se pronuncia en su programa</span>';
      } else {
        dentro = ESCALA.map(function (o) {
          return '<span class="celda">' + (o.v === po.v ? '<span class="marca-p" title="' + esc(etiqueta(po.v)) + '"></span>' : "") + "</span>";
        }).join("");
      }
      return '<div class="' + cls + '"><span class="pn">' + esc(p.nombre) + "</span>" + dentro + "</div>";
    }).join("");

    var resumenAccesible = D.partidos.map(function (p) {
      var v = q.posturas[p.id] ? q.posturas[p.id].v : null;
      return p.nombre + ": " + (v == null ? "no se pronuncia" : etiqueta(v).toLowerCase());
    }).join("; ");

    var tuRespuesta = !r ? "No llegaste a responder esta propuesta."
      : r.v == null ? "Respondiste: <strong>no lo sé</strong> (no cuenta para el resultado)."
      : "Respondiste: <strong>" + etiqueta(r.v).toLowerCase() + "</strong>" + (r.imp ? " · la marcaste como muy importante (cuenta doble)" : "") + ".";

    var citas = D.partidos.map(function (p) {
      var po = q.posturas[p.id] || {};
      return "<li><strong>" + esc(p.nombre) + "</strong>: " +
        (po.v == null ? "no se pronuncia." : esc(etiqueta(po.v)) + (po.cita ? " — " + esc(po.cita) : "")) + "</li>";
    }).join("");

    return '<li class="item">' +
      '<div class="meta"><span>' + esc(q.tema) + "</span><span>" + esc(q.fuente) + "</span></div>" +
      '<p class="cita">' + esc(q.texto) + "</p>" +
      '<p class="autor">Propuesta de <strong>' + esc(NOMBRE[q.autor]) + "</strong></p>" +
      '<div class="regla" role="img" aria-label="' + esc(resumenAccesible + ". Tu respuesta: " + (uv == null ? "ninguna" : etiqueta(uv).toLowerCase())) + '">' + ejes +
      '<div class="cuerpo"' + (uv != null ? ' style="--pos:' + (uv + 2) + '"' : "") + ">" +
      (uv != null ? '<div class="tu-col" aria-hidden="true"></div>' : "") + filas + "</div></div>" +
      '<p class="respuesta-usuario">' + tuRespuesta + "</p>" +
      '<details class="citas"><summary>Ver en qué se basa cada postura</summary><ul>' + citas + "</ul></details>" +
      "</li>";
  }

  // ---------- metodología ----------
  function pintarMetodologia() {
    var v = D.validacion;
    var pruebas = v.pruebas.map(function (p) {
      return '<li class="prueba"><div class="prueba-cab"><strong>' + esc(p.prueba) + "</strong>" +
        '<span class="' + (p.ok ? "estado-ok\">Aprobada" : "estado-mal\">No aprobada") + "</span></div>" +
        '<p class="tenue">' + esc(p.que) + "</p>" +
        "<dl><dt>Criterio</dt><dd>" + esc(p.criterio) + "</dd><dt>Resultado</dt><dd>" + esc(p.resultado) + "</dd></dl></li>";
    }).join("");
    var nPorPartido = D.propuestas.length / D.partidos.length;

    app.innerHTML =
      "<h1>Cómo funciona</h1>" +
      "<p>Esta web no recomienda votar a nadie. Compara tus respuestas con lo que dicen los programas electorales y te muestra con quién coincides más, y por qué.</p>" +

      "<h2>Qué partidos y qué propuestas</h2>" +
      "<p>" + esc(D.config.nota_partidos) + "</p>" +
      "<p>De cada programa se eligen " + nPorPartido + " propuestas, sea cual sea su longitud, para que ningún partido aparezca más veces que otro. " +
      "Solo valen propuestas concretas, que se entiendan solas, que no revelen de qué partido son y en las que unos partidos estén a favor y otros en contra. " +
      "El texto es literal; el único retoque permitido es sustituir un nombre propio por [corchetes].</p>" +

      "<h2>Qué opina cada partido</h2>" +
      "<p>Para cada propuesta se anota la postura de todos los partidos, no solo del que la escribió: muy a favor, a favor, neutral, en contra o muy en contra. " +
      "Cada postura se apoya en una frase del programa de ese partido, que puedes ver al final del test. Si el programa no dice nada, no se inventa: ese partido simplemente no se compara en esa pregunta.</p>" +

      "<h2>Cómo se calcula</h2>" +
      "<p>En cada pregunta se mide lo cerca que estás de cada partido y se compara con lo que coincidiría alguien respondiendo al azar:</p>" +
      '<div class="formula">acuerdo = 1 − |tu respuesta − postura del partido| / 4<br>' +
      "κ = (acuerdo − acuerdo al azar) / (1 − acuerdo al azar)<br>" +
      "coincidencia = 50 + 50 × media de κ (las preguntas marcadas como muy importantes cuentan doble)<br>" +
      "coincidencia final = (n × coincidencia + " + D.parametros.k + " × 50) / (n + " + D.parametros.k + ")</div>" +
      '<p class="en-sencillo" style="margin-top:1rem">En sencillo: 100 % es pensar exactamente igual que el partido; 50 % es lo que sacarías respondiendo al azar. ' +
      "La comparación con el azar evita que salgan favorecidos los partidos con posturas más tibias. La última línea acerca un poco al 50 % a los partidos que se pronuncian sobre pocas propuestas (n), " +
      "para que no salgan arriba por casualidad.</p>" +
      "<p>Para saber si el resultado es claro, el cálculo se repite " + D.parametros.bootstrap.toLocaleString("es") +
      " veces con distintas combinaciones de tus respuestas (técnica <i>bootstrap</i>). Si el primero no queda primero en al menos el " +
      Math.round(D.parametros.umbral_empate * 100) + " % de las repeticiones, se indica empate técnico.</p>" +

      "<h2>Pruebas de neutralidad</h2>" +
      "<p>Antes de publicar, el cálculo se pone a prueba con miles de usuarios simulados. Estos son los resultados con los datos actuales (" + esc(v.fecha) + "):</p>" +
      '<ul class="pruebas">' + pruebas + "</ul>" +

      "<h2>Privacidad</h2>" +
      "<p>Tus respuestas no salen de tu dispositivo: no hay servidor, base de datos, cookies ni estadísticas de visitas. Al cerrar o recargar la página, desaparecen.</p>" +

      "<h2>Datos y autoría</h2>" +
      '<p>Puedes descargar todas las propuestas, posturas y citas en <a href="datos/datos.xlsx">datos.xlsx</a>. ' +
      "Hecho por " + esc(D.config.autoria) + ", sin financiación de ningún partido ni organización.</p>" +
      '<div class="fila-botones"><a class="boton" href="#/">Volver al inicio</a></div>';
    app.focus({ preventScroll: true });
  }

  // ---------- arranque ----------
  if (D.config.demo) document.getElementById("aviso-demo").hidden = false;
  document.title = D.config.titulo;
  render();
})();
