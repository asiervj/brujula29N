/* Brújula 29N — interfaz.
   Las respuestas solo viven en la variable `estado`: no se guardan ni se envían a ningún sitio. */
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
  var PARTIDO = {};
  D.partidos.forEach(function (p) { PARTIDO[p.id] = p; });
  var N = D.propuestas.length;
  var POR_PARTIDO = Math.round(N / D.partidos.length);
  var MINUTOS = Math.max(5, Math.round(N * 0.25));

  var estado = nuevoEstado();
  function nuevoEstado() {
    return { orden: barajar(D.propuestas), idx: 0, resp: {}, imp: {}, filtroTema: "", resaltar: "", abiertas: false };
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
  function nombre(id) { return PARTIDO[id] ? PARTIDO[id].nombre : id; }
  function enlacePagina(id, pagina) {
    var p = PARTIDO[id];
    if (!p || !p.url) return "";
    return p.url + (pagina ? "#page=" + pagina : "");
  }
  function refHTML(id, pagina, apartado) {
    var p = PARTIDO[id];
    var txt = esc(p.programa) + (apartado ? ", " + esc(apartado) : "") + (pagina ? ", p. " + pagina : "");
    return '<a href="' + esc(enlacePagina(id, pagina)) + '" target="_blank" rel="noopener">' + txt + "</a>";
  }
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Orden aleatorio para cada persona, sin dos propuestas seguidas del mismo tema.
  function barajar(lista) {
    var resto = lista.slice(), salida = [];
    while (resto.length) {
      var ultimo = salida.length ? salida[salida.length - 1].tema : null;
      var cand = resto.filter(function (q) { return q.tema !== ultimo; });
      if (!cand.length) cand = resto;
      var e = cand[Math.floor(Math.random() * cand.length)];
      salida.push(e);
      resto.splice(resto.indexOf(e), 1);
    }
    return salida;
  }
  function validas() {
    return D.propuestas.filter(function (q) { return estado.resp[q.id] && estado.resp[q.id].v != null; }).length;
  }
  function testEmpezado() { return Object.keys(estado.resp).length > 0; }

  // ---------- rutas ----------
  function ir(ruta) { if (location.hash !== ruta) location.hash = ruta; else render(); }
  window.addEventListener("hashchange", render);

  function render() {
    var ruta = location.hash.replace(/^#/, "") || "/";
    document.removeEventListener("keydown", teclas);
    var seccion = null;
    if (ruta === "/test") pintarTest();
    else if (ruta === "/resultados") pintarResultados();
    else if (ruta === "/metodologia") pintarMetodologia();
    else if (ruta === "/fuentes") pintarFuentes();
    else { pintarInicio(); if (ruta === "/como-funciona") seccion = "como-funciona"; }

    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var activo = a.getAttribute("data-nav") === ruta.replace("/", "");
      if (activo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var navTest = document.getElementById("nav-test");
    navTest.textContent = ruta !== "/test" && testEmpezado() && estado.idx < estado.orden.length ? "Seguir el test" : "Hacer el test";
    navTest.style.visibility = ruta === "/test" ? "hidden" : "visible";

    if (seccion) {
      var el = document.getElementById(seccion);
      if (el) el.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  // ---------- portada ----------
  function brujulaSVG() {
    var marcas = "";
    for (var g = 0; g < 360; g += 10) {
      var largo = g % 90 === 0 ? 22 : g % 30 === 0 ? 14 : 8;
      var r1 = 168, r2 = 168 - largo, a = (g - 90) * Math.PI / 180;
      marcas += '<line x1="' + (200 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (200 + r1 * Math.sin(a)).toFixed(1) +
        '" x2="' + (200 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (200 + r2 * Math.sin(a)).toFixed(1) +
        '" stroke="var(--tinta)" stroke-width="' + (g % 90 === 0 ? 3 : 1.5) + '" stroke-linecap="round" opacity="' + (g % 30 === 0 ? 0.9 : 0.35) + '"/>';
    }
    var letras = [["N", 200, 78], ["E", 322, 207], ["S", 200, 336], ["O", 78, 207]].map(function (l) {
      return '<text x="' + l[1] + '" y="' + l[2] + '" text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="24" fill="var(--tinta)">' + l[0] + "</text>";
    }).join("");
    return '<svg class="brujula" viewBox="0 0 400 400" role="img" aria-label="Brújula">' +
      '<circle cx="200" cy="200" r="190" fill="var(--hoja)" stroke="var(--linea-2)" stroke-width="1.5"/>' +
      '<circle cx="200" cy="200" r="178" fill="none" stroke="var(--tinta)" stroke-width="2"/>' +
      marcas + letras +
      '<circle cx="200" cy="200" r="104" fill="none" stroke="var(--linea)" stroke-width="1.5" stroke-dasharray="2 6"/>' +
      '<g class="aguja"><path d="M200 58 L223 200 L177 200 Z" fill="var(--oro)"/><path d="M200 342 L223 200 L177 200 Z" fill="var(--tinta)"/></g>' +
      '<circle cx="200" cy="200" r="13" fill="var(--hoja)" stroke="var(--tinta)" stroke-width="3"/></svg>';
  }

  function pintarInicio() {
    var c = D.config;
    var faq = [
      ["¿Me dice a quién tengo que votar?",
        "No. Te muestra con qué propuestas coincides y de qué partido son, para que decidas con información de primera mano. El voto es tuyo."],
      ["¿Cómo sé que no está sesgado?",
        "Por tres motivos que puedes comprobar: las propuestas son literales y enlazan a su página del programa; todos los partidos tienen el mismo número de propuestas (" + POR_PARTIDO + "); y antes de publicar, el cálculo supera seis pruebas con miles de usuarios simulados. Todo está explicado en la <a href=\"#/metodologia\">metodología</a>."],
      ["¿Por qué aparecen estos partidos?", esc(c.nota_partidos)],
      ["¿Qué pasa si marco «Esto me importa mucho»?",
        "Esa propuesta cuenta el doble al calcular tu resultado. Úsalo en los temas que más pesan en tu voto: así el resultado refleja mejor tus prioridades. Si no lo marcas en ninguna, todas cuentan igual."],
      ["¿Qué significa «empate técnico»?",
        "Que la diferencia entre los dos primeros es tan pequeña que depende de una o dos respuestas. En lugar de darte un ganador poco fiable, te lo decimos claramente."],
      ["¿Y si un partido no dice nada sobre una propuesta?",
        "Entonces no se le compara en esa pregunta. No le ponemos una postura que su programa no recoge. El cálculo tiene en cuenta en cuántas propuestas se ha podido comparar a cada partido."],
      ["¿Qué hacéis con mis respuestas?",
        "Nada: no salen de tu dispositivo. No hay registro, base de datos, cookies ni estadísticas. Al cerrar la página, desaparecen."],
      ["¿Puedo revisar los datos?",
        "Sí. En los resultados verás, para cada propuesta, la cita del programa en la que se basa la postura de cada partido. En <a href=\"#/fuentes\">Fuentes</a> puedes descargar la tabla completa."]
    ];

    app.innerHTML =
      '<section class="heroe"><div class="heroe-in"><div>' +
      "<h1>¿Qué programa se parece más a lo que piensas?</h1>" +
      '<p class="lead">Lee propuestas copiadas literalmente de los programas electorales, sin saber de qué partido son, y di si estás a favor o en contra. Al final verás con quién coincides y por qué.</p>' +
      '<div class="fila-botones"><a class="boton" href="#/test">' + (testEmpezado() ? "Seguir el test" : "Empezar el test") + '</a>' +
      '<a class="boton claro" href="#/como-funciona">Cómo funciona</a></div>' +
      '<p class="nota">Son ' + N + " propuestas y se tarda unos " + MINUTOS + " minutos. No hace falta registrarse y no guardamos tus respuestas.</p>" +
      "</div>" + brujulaSVG() + "</div></section>" +

      '<section class="seccion alterna" id="como-funciona"><div class="contenido">' +
      '<div class="cab-seccion"><h2>Cómo funciona</h2><p class="lead">Tres pasos. Sin trampas y con todas las fuentes a la vista.</p></div>' +
      '<ol class="pasos">' +
      '<li class="paso"><h3>Lees una propuesta</h3><p>Cada una es una frase literal de un programa electoral. No verás el partido, el logo ni el color hasta el final. Hay ' + POR_PARTIDO + " de cada partido.</p></li>" +
      '<li class="paso"><h3>Das tu opinión</h3><p>Eliges entre «muy en contra» y «muy a favor». Si un tema pesa mucho en tu voto, márcalo como importante y contará el doble.</p></li>' +
      '<li class="paso"><h3>Ves con quién coincides</h3><p>Obtienes tu porcentaje de afinidad con cada partido y, propuesta a propuesta, a quién pertenece y qué opina cada partido, con la cita y la página de su programa.</p></li>' +
      "</ol>" +
      '<div class="simulador" id="simulador"></div>' +
      "</div></section>" +

      '<section class="seccion" id="confianza"><div class="contenido">' +
      '<div class="cab-seccion"><h2>Por qué puedes fiarte</h2><p class="lead">Una herramienta así solo es útil si es neutral. Estas son las reglas que seguimos.</p></div>' +
      '<div class="principios">' +
      '<div class="principio"><h3>Texto literal, con su fuente</h3><p>No resumimos ni reescribimos las propuestas. Cada una indica de qué programa y de qué página sale, con enlace al documento original.</p></div>' +
      '<div class="principio"><h3>El mismo peso para cada partido</h3><p>' + POR_PARTIDO + " propuestas de cada programa, sea cual sea su extensión. Ningún partido aparece más veces que otro.</p></div>" +
      '<div class="principio"><h3>Comprobado antes de publicar</h3><p>El cálculo se somete a seis pruebas con miles de usuarios simulados. Solo se publica si las supera todas. <a href="#/metodologia">Ver las pruebas</a>.</p></div>' +
      '<div class="principio"><h3>Tus respuestas no salen de tu dispositivo</h3><p>No hay registro, base de datos ni cookies. El resultado se calcula en tu propio navegador.</p></div>' +
      "</div></div></section>" +

      '<section class="seccion oscura" id="nosotros"><div class="contenido dos-col">' +
      "<div><h2>Nuestro objetivo</h2>" +
      "<p>Los programas electorales son largos y casi nadie los lee enteros. Queremos acercarte a lo que proponen de verdad los partidos, sin intermediarios ni interpretaciones.</p>" +
      "<p>Brújula 29N no te dice a quién votar. Te muestra con qué propuestas coincides para que decidas tú, con la información de primera mano.</p></div>" +
      "<div><h2>Quiénes somos</h2><p>" + esc(c.quienes_somos) + "</p>" +
      (c.contacto ? '<p>Si encuentras un error en una cita o en una postura, escríbenos a <a href="mailto:' + esc(c.contacto) + '">' + esc(c.contacto) + "</a>.</p>" : "") +
      (c.repositorio ? '<p>El código y los datos son públicos: <a href="' + esc(c.repositorio) + '" target="_blank" rel="noopener">ver el repositorio</a>.</p>' : "") +
      "</div></div></section>" +

      '<section class="seccion" id="preguntas"><div class="contenido"><div style="max-width:var(--lectura)">' +
      '<div class="cab-seccion"><h2>Preguntas frecuentes</h2></div><div class="faq">' +
      faq.map(function (f) { return "<details><summary>" + f[0] + '</summary><div class="resp">' + f[1] + "</div></details>"; }).join("") +
      "</div></div></div></section>" +

      '<section class="seccion alterna llamada"><div class="llamada-in"><h2>¿Empezamos? Son unos ' + MINUTOS + " minutos.</h2>" +
      '<a class="boton" href="#/test">' + (testEmpezado() ? "Seguir el test" : "Empezar el test") + "</a></div></section>";

    pintarSimulador();
  }

  // Ejemplo interactivo: cómo se compara una respuesta con la postura de cada partido.
  var sim = { u: 1, imp: false };
  function pintarSimulador() {
    var caja = document.getElementById("simulador");
    if (!caja) return;
    var partidosEj = [["Partido A", 2], ["Partido B", 0], ["Partido C", -1]];
    var filas = partidosEj.map(function (p) {
      var d = Math.abs(sim.u - p[1]);
      var cerca = 100 * (1 - d / 4);
      return '<div class="mini-fila"><span class="nom">' + p[0] + "<small>" + etiqueta(p[1]) + "</small></span>" +
        '<span class="pista" aria-hidden="true"><span style="width:' + cerca + '%"></span></span>' +
        '<span class="val">' + pct(cerca) + "</span></div>";
    }).join("");
    caja.innerHTML =
      "<div><h3>Pruébalo con un ejemplo</h3>" +
      '<p class="tenue">Imagina esta propuesta y tres partidos con posturas distintas. Elige tu respuesta y mira cómo cambia la cercanía con cada uno.</p>' +
      '<p class="ejemplo">«Ampliar el horario de las bibliotecas públicas.»</p>' +
      '<div class="opciones-mini" role="group" aria-label="Tu respuesta de ejemplo">' +
      ESCALA.map(function (o) { return '<button type="button" data-v="' + o.v + '" aria-pressed="' + (sim.u === o.v) + '">' + o.t + "</button>"; }).join("") +
      "</div>" +
      '<label class="importa" style="margin-top:1rem;display:inline-flex"><input type="checkbox" id="sim-imp"' + (sim.imp ? " checked" : "") + "> Esto me importa mucho <small>(cuenta el doble)</small></label></div>" +
      '<div class="resultado-mini" aria-live="polite"><p class="peq tenue" style="margin-bottom:.4rem">Cercanía en esta propuesta</p>' + filas +
      '<p class="explica-mini">' + (sim.imp
        ? "Como la has marcado como importante, esta propuesta pesará el doble que las demás al hacer la media final."
        : "Coinciden del todo si pensáis igual (100 %) y nada si pensáis lo contrario (0 %).") +
      " Tu resultado final hace la media de todas las propuestas y la compara con lo que saldría respondiendo al azar.</p></div>";
    caja.querySelectorAll("button[data-v]").forEach(function (b) {
      b.onclick = function () { sim.u = Number(b.getAttribute("data-v")); pintarSimulador(); };
    });
    document.getElementById("sim-imp").onchange = function (e) { sim.imp = e.target.checked; pintarSimulador(); };
  }

  // ---------- test ----------
  var avanzando = false;
  function pintarTest() {
    var total = estado.orden.length;
    if (estado.idx >= total) return ir("#/resultados");
    var q = estado.orden[estado.idx];
    var r = estado.resp[q.id];
    var imp = !!estado.imp[q.id];

    app.innerHTML =
      '<div class="pantalla-test">' +
      '<div class="progreso"><span>Propuesta ' + (estado.idx + 1) + " de " + total + "</span><span>" + esc(q.tema) + "</span></div>" +
      '<div class="barra-progreso" aria-hidden="true"><span style="width:' + (100 * estado.idx / total) + '%"></span></div>' +
      '<div class="tarjeta-pregunta"><p class="tema">¿Qué te parece esta propuesta?</p>' +
      '<p class="cita" id="texto-propuesta" tabindex="-1">' + esc(q.texto) + "</p>" +
      (q.aclaracion ? '<p class="aclaracion"><strong>Aclaración:</strong> ' + esc(q.aclaracion) + "</p>" : "") +
      "</div>" +
      '<div class="escala" role="group" aria-labelledby="texto-propuesta">' +
      ESCALA.map(function (o) {
        return '<button class="opcion" data-v="' + o.v + '" aria-pressed="' + !!(r && r.v === o.v) + '"><span class="punto" aria-hidden="true"></span>' + o.t + "</button>";
      }).join("") + "</div>" +
      '<div class="extras">' +
      '<label class="importa"><input type="checkbox" id="imp"' + (imp ? " checked" : "") + "> Esto me importa mucho <small>(cuenta el doble)</small></label>" +
      '<button class="no-se" aria-pressed="' + !!(r && r.v == null) + '">No lo sé / no lo entiendo</button>' +
      "</div>" +
      '<div class="navegacion">' +
      (estado.idx > 0 ? '<button class="boton-texto" id="atras">Anterior</button>' : "<span></span>") +
      (r ? '<button class="boton-texto" id="siguiente">Siguiente</button>' : "") +
      "</div>" +
      '<p class="atajos">Atajos de teclado: 1 a 5 para responder, 0 para «no lo sé», flecha izquierda para volver.</p></div>';

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
    if (sig) sig.onclick = avanzar;
    document.addEventListener("keydown", teclas);
    document.getElementById("texto-propuesta").focus({ preventScroll: true });
  }

  function responder(q, v) {
    if (avanzando) return;
    avanzando = true;
    estado.resp[q.id] = { v: v, imp: !!estado.imp[q.id] };
    app.querySelectorAll(".opcion").forEach(function (b) {
      b.setAttribute("aria-pressed", String(v !== null && Number(b.getAttribute("data-v")) === v));
    });
    app.querySelector(".no-se").setAttribute("aria-pressed", String(v === null));
    setTimeout(avanzar, 230);
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
    if (!testEmpezado()) return ir("#/");
    var n = validas(), min = D.config.min_respuestas;
    if (n < min) {
      app.innerHTML = '<div class="pantalla"><h1>Faltan respuestas</h1>' +
        "<p>Has dado tu opinión en " + n + " propuestas. Para que el resultado sea fiable hacen falta al menos " + min +
        ". Puedes volver y cambiar algunas de las que marcaste como «no lo sé».</p>" +
        '<div class="fila-botones"><button class="boton" id="revisar">Volver a las propuestas</button>' +
        '<button class="boton claro" id="reiniciar">Empezar de nuevo</button></div></div>';
      document.getElementById("revisar").onclick = function () { estado.idx = 0; ir("#/test"); };
      document.getElementById("reiniciar").onclick = function () { estado = nuevoEstado(); ir("#/test"); };
      return;
    }

    var res = Motor.puntuar(D, estado.resp);
    var cuotas = Motor.estabilidad(D, estado.resp);
    res.forEach(function (r, i) { r.cuota = cuotas[i]; });
    var orden = res.slice().sort(function (a, b) { return b.ajustado - a.ajustado; });
    var p1 = orden[0], p2 = orden[1];
    var claro = p1.cuota >= D.parametros.umbral_empate;
    var nImp = D.propuestas.filter(function (q) { return estado.resp[q.id] && estado.resp[q.id].imp && estado.resp[q.id].v != null; }).length;

    var veredicto = claro
      ? '<p class="tit">Coincides más con ' + esc(nombre(p1.id)) + ".</p>" +
        "<p>Es un resultado claro: al repetir el cálculo " + D.parametros.bootstrap.toLocaleString("es") + " veces con distintas combinaciones de tus respuestas, " +
        esc(nombre(p1.id)) + " queda primero en el " + pct(100 * p1.cuota) + " de los casos.</p>"
      : '<p class="tit">Empate técnico entre ' + esc(nombre(p1.id)) + " y " + esc(nombre(p2.id)) + ".</p>" +
        "<p>" + esc(nombre(p1.id)) + " queda por delante, pero al repetir el cálculo " + D.parametros.bootstrap.toLocaleString("es") +
        " veces con distintas combinaciones de tus respuestas solo queda primero en el " + pct(100 * p1.cuota) + " de los casos. La diferencia depende de muy pocas propuestas.</p>";

    var ranking = orden.map(function (r) {
      return '<li><div class="cab"><span class="nombre">' + esc(nombre(r.id)) + '</span><span class="pct">' + pct(r.ajustado) + "</span></div>" +
        '<div class="barra-r" role="img" aria-label="' + esc(nombre(r.id)) + ": " + pct(r.ajustado) + ' de coincidencia"><span style="width:' + r.ajustado.toFixed(1) + '%"></span><i class="azar"></i></div>' +
        '<div class="detalle">Comparado en ' + r.n + " de " + N + " propuestas</div></li>";
    }).join("");

    var temas = [];
    D.propuestas.forEach(function (q) { if (temas.indexOf(q.tema) < 0) temas.push(q.tema); });
    temas.sort(function (a, b) { return a.localeCompare(b, "es"); });

    app.innerHTML =
      '<div class="pantalla"><h1>Tu resultado</h1>' +
      '<div class="veredicto">' + veredicto + "</div>" +
      '<ol class="ranking">' + ranking + "</ol>" +
      '<p class="leyenda-azar"><i aria-hidden="true"></i><span>La raya marca el 50 %: lo que coincidirías con cualquier partido respondiendo al azar.' +
      (nImp ? " Las " + nImp + " propuestas que marcaste como importantes han contado el doble." : "") + "</span></p>" +
      '<div class="fila-botones"><button class="boton claro" id="otra-vez">Repetir el test</button><a href="#/metodologia">Cómo se calcula</a></div>' +

      '<section class="bloque-desglose"><h2>Propuesta a propuesta</h2>' +
      "<p>Ahora puedes ver de quién era cada propuesta, dónde está en su programa y qué opina cada partido. Despliega «Por qué cada partido está aquí» para leer la cita en la que se basa cada postura.</p>" +
      '<div class="filtros">' +
      '<label>Tema<select id="f-tema"><option value="">Todos</option>' +
      temas.map(function (t) { return '<option value="' + esc(t) + '"' + (estado.filtroTema === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") +
      "</select></label>" +
      '<label>Resaltar partido<select id="f-partido"><option value="">Ninguno</option>' +
      D.partidos.map(function (p) { return '<option value="' + esc(p.id) + '"' + (estado.resaltar === p.id ? " selected" : "") + ">" + esc(p.nombre) + "</option>"; }).join("") +
      "</select></label>" +
      '<button class="boton-texto" id="abrir-todas">' + (estado.abiertas ? "Ocultar todas las citas" : "Mostrar todas las citas") + "</button></div>" +
      '<div class="leyenda-regla"><span><i class="lp"></i>Postura de cada partido según su programa</span><span><i class="la"></i>Partido que hizo la propuesta</span><span><i class="lt"></i>Tu respuesta</span></div>' +
      '<ol class="desglose" id="desglose"></ol></section></div>';

    document.getElementById("otra-vez").onclick = function () { estado = nuevoEstado(); ir("#/test"); };
    document.getElementById("f-tema").onchange = function (e) { estado.filtroTema = e.target.value; pintarDesglose(); };
    document.getElementById("f-partido").onchange = function (e) { estado.resaltar = e.target.value; pintarDesglose(); };
    document.getElementById("abrir-todas").onclick = function (e) {
      estado.abiertas = !estado.abiertas;
      e.target.textContent = estado.abiertas ? "Ocultar todas las citas" : "Mostrar todas las citas";
      pintarDesglose();
    };
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
      return o.v === uv ? '<span class="tu">' + o.t + "<br>(tú)</span>" : "<span>" + o.t + "</span>";
    }).join("") + "</div>";

    var filas = D.partidos.map(function (p) {
      var po = q.posturas[p.id] || { v: null };
      var cls = "fila" + (p.id === q.autor ? " autor-fila" : "") +
        (estado.resaltar ? (estado.resaltar === p.id ? " resaltada" : " atenuada") : "");
      var dentro = po.v == null
        ? '<span class="silencio">Su programa no se pronuncia</span>'
        : ESCALA.map(function (o) {
            return '<span class="celda">' + (o.v === po.v ? '<span class="marca-p" title="' + esc(etiqueta(po.v)) + '"></span>' : "") + "</span>";
          }).join("");
      return '<div class="' + cls + '"><span class="pn">' + esc(p.nombre) + "</span>" + dentro + "</div>";
    }).join("");

    var accesible = D.partidos.map(function (p) {
      var v = q.posturas[p.id] ? q.posturas[p.id].v : null;
      return p.nombre + ": " + (v == null ? "no se pronuncia" : etiqueta(v).toLowerCase());
    }).join("; ") + ". Tu respuesta: " + (uv == null ? "ninguna" : etiqueta(uv).toLowerCase()) + ".";

    var tuRespuesta = !r ? "No llegaste a responder esta propuesta."
      : r.v == null ? "Respondiste <strong>no lo sé</strong>: no cuenta para el resultado."
      : "Respondiste <strong>" + etiqueta(r.v).toLowerCase() + "</strong>" + (r.imp ? " y la marcaste como importante: ha contado el doble" : "") + ".";

    var justif = D.partidos.map(function (p) {
      var po = q.posturas[p.id] || {};
      var esAutor = p.id === q.autor;
      var cuerpo = po.v == null
        ? '<span class="tenue">Su programa no recoge una postura sobre esta propuesta, así que no se le compara en ella.</span>'
        : '<span class="jpos">' + esc(etiqueta(po.v)) + (esAutor ? " · autor de la propuesta" : "") + "</span><br>" +
          (esAutor ? '<span class="tenue">Es el partido que la propone.</span>' : "<q>" + esc(po.cita) + "</q>") +
          '<span class="jref">' + refHTML(p.id, po.pagina) + "</span>";
      return '<li><span class="jp">' + esc(p.nombre) + "</span><div>" + cuerpo + "</div></li>";
    }).join("");

    return '<li class="item">' +
      '<div class="meta"><span>' + esc(q.tema) + "</span><span>Propuesta de <strong>" + esc(nombre(q.autor)) + "</strong></span></div>" +
      '<p class="cita">' + esc(q.texto) + "</p>" +
      (q.aclaracion ? '<p class="aclaracion"><strong>Aclaración:</strong> ' + esc(q.aclaracion) + "</p>" : "") +
      '<p class="fuente-prop">Fuente: ' + refHTML(q.autor, q.pagina, q.apartado) + "</p>" +
      '<div class="regla" role="img" aria-label="' + esc(accesible) + '">' + ejes +
      '<div class="cuerpo"' + (uv != null ? ' style="--pos:' + (uv + 2) + '"' : "") + ">" +
      (uv != null ? '<div class="tu-col" aria-hidden="true"></div>' : "") + filas + "</div></div>" +
      '<p class="respuesta-usuario">' + tuRespuesta + "</p>" +
      '<details class="justif"' + (estado.abiertas ? " open" : "") + "><summary>Por qué cada partido está aquí</summary>" +
      '<ul class="justif-lista">' + justif + "</ul></details>" +
      "</li>";
  }

  // ---------- metodología ----------
  var EXPLICA = {
    "Votante perfecto": "Simulamos a una persona que responde exactamente lo que dice el programa de cada partido. El test debe asignarle ese partido.",
    "Votante realista": "Simulamos 5.000 personas por partido que piensan parecido a él, pero no igual: cambian parte de sus respuestas y dejan algunas en blanco. A la gran mayoría le debe seguir saliendo su partido.",
    "Votante al azar": "Simulamos 100.000 personas que responden al azar. Ningún partido debe salir favorecido: todos deben ganar un número de veces parecido.",
    "Todo sí / todo no": "Simulamos personas que marcan siempre la misma respuesta, sin leer. No deben quedar asignadas claramente a ningún partido.",
    "Pregunta decisiva": "Quitamos cada propuesta, de una en una. Ninguna debe poder cambiar por sí sola el resultado.",
    "Otra fórmula": "Repetimos el cálculo con otra forma de medir la distancia entre respuestas. El ganador debe ser el mismo en casi todos los casos."
  };

  function pintarMetodologia() {
    var v = D.validacion;
    var controles = v.pruebas.map(function (p) {
      return '<li class="control"><div class="control-cab"><h3>' + esc(p.prueba) + "</h3>" + (p.ok ? '<span class="sello">' + CHECK + "Superada</span>" : '<span class="sello" style="color:var(--texto);background:var(--fondo-2)">No superada</span>') + "</div>" +
        "<p>" + esc(EXPLICA[p.prueba] || p.que) + "</p>" +
        '<p class="res"><strong>Criterio:</strong> ' + esc(p.criterio) + "<br><strong>Resultado:</strong> " + esc(p.resultado) + "</p></li>";
    }).join("");
    var fecha = v.fecha.split(" ")[0].split("-").reverse().join("/");

    app.innerHTML =
      '<article class="pagina"><h1>Metodología</h1>' +
      '<p class="lead">Cómo elegimos las propuestas, cómo sabemos qué opina cada partido y cómo se calcula tu resultado.</p>' +
      '<div class="resumen"><ul>' +
      "<li>Propuestas literales: " + POR_PARTIDO + " de cada partido, con su página del programa.</li>" +
      "<li>La postura de cada partido sale de una cita de su propio programa.</li>" +
      "<li>Tu resultado compara tus respuestas con esas posturas; lo importante cuenta el doble.</li>" +
      "<li>Antes de publicar, el cálculo supera seis controles de calidad.</li>" +
      "<li>No se guarda nada de lo que respondes.</li></ul></div>" +
      '<nav class="indice" aria-label="En esta página"><a href="#m-partidos">Partidos</a><a href="#m-propuestas">Propuestas</a><a href="#m-posturas">Posturas</a><a href="#m-calculo">Cálculo</a><a href="#m-importante">Lo importante</a><a href="#m-empate">Empate técnico</a><a href="#m-controles">Controles</a><a href="#m-privacidad">Privacidad</a></nav>' +

      '<h2 id="m-partidos">Qué partidos aparecen</h2><p>' + esc(D.config.nota_partidos) + "</p>" +

      '<h2 id="m-propuestas">Cómo se eligen las propuestas</h2>' +
      "<p>De cada programa se toman " + POR_PARTIDO + " propuestas, para que ningún partido aparezca más que otro. Cada una debe cumplir cuatro reglas:</p><ol>" +
      "<li><strong>Concreta.</strong> Una medida que se pueda cumplir o no, no una declaración general.</li>" +
      "<li><strong>Que distinga.</strong> Al menos un partido la apoya y otro la rechaza; si todos opinan igual, no ayuda a decidir.</li>" +
      "<li><strong>Que no delate a su autor.</strong> Se descartan las que nombran al partido, a sus líderes o a sus rivales. El único retoque permitido es sustituir un nombre propio por [corchetes].</li>" +
      "<li><strong>Que se entienda sola.</strong> Cuando usa un término técnico, añadimos una aclaración aparte, sin tocar el texto original.</li></ol>" +
      "<p>El texto nunca se reescribe. Si una frase es demasiado larga, se recorta y el corte se marca con […]. Los títulos que el programa escribe en mayúsculas se transcriben en minúscula, sin cambiar ninguna palabra.</p>" +
      "<p>Además se reparten entre temas distintos y aparecen en un orden aleatorio para cada persona.</p>" +

      '<h2 id="m-posturas">Cómo sabemos qué opina cada partido</h2>' +
      "<p>Para cada propuesta anotamos la postura de <em>todos</em> los partidos, no solo la del que la hizo. Así, si estás de acuerdo con una propuesta, te acerca a quienes la apoyan y te aleja de quienes la rechazan.</p>" +
      '<table class="tabla-esc"><thead><tr><th>Postura</th><th>Cuándo se asigna</th></tr></thead><tbody>' +
      "<tr><td>Muy a favor</td><td>La propone o la apoya claramente. El autor siempre está aquí.</td></tr>" +
      "<tr><td>A favor</td><td>La apoya con matices o propone algo muy parecido.</td></tr>" +
      "<tr><td>Neutral</td><td>Su programa recoge una postura intermedia.</td></tr>" +
      "<tr><td>En contra</td><td>Propone algo distinto que choca con ella.</td></tr>" +
      "<tr><td>Muy en contra</td><td>La rechaza expresamente o propone lo contrario.</td></tr>" +
      "<tr><td>No se pronuncia</td><td>Su programa no dice nada. No se le compara en esa propuesta.</td></tr></tbody></table>" +
      "<p>Cada postura se apoya en una cita literal del programa de ese partido, con su página. Puedes leerlas todas en tus resultados, en «Por qué cada partido está aquí», y descargarlas en <a href=\"#/fuentes\">Fuentes</a>.</p>" +

      '<h2 id="m-calculo">Cómo se calcula tu resultado</h2>' +
      "<p>En cada propuesta medimos lo cerca que estás de cada partido: 100 % si pensáis igual y 0 % si pensáis lo contrario. Después hacemos la media de todas las propuestas que respondiste.</p>" +
      "<p>Esa media se compara con lo que coincidiría alguien respondiendo al azar. Por eso <strong>50 % significa «como el azar»</strong> y 100 % «exactamente igual». Esta corrección evita que salgan favorecidos los partidos con posturas más tibias, que si no saldrían más cerca de casi todo el mundo.</p>" +
      "<p>Por último, si un partido no se pronuncia en muchas propuestas, su porcentaje se acerca ligeramente al 50 %, para que no salga arriba por casualidad con pocas comparaciones.</p>" +
      '<details class="mas"><summary>Ver la fórmula exacta</summary><div class="formula">' +
      "cercanía = 1 − |tu respuesta − postura del partido| / 4<br>" +
      "κ = (cercanía − cercanía esperada al azar) / (1 − cercanía esperada al azar)<br>" +
      "coincidencia = 50 + 50 × media ponderada de κ<br>" +
      "resultado = (n × coincidencia + " + D.parametros.k + " × 50) / (n + " + D.parametros.k + ")</div>" +
      '<p class="peq tenue" style="margin-top:.75rem">Las respuestas van de −2 (muy en contra) a +2 (muy a favor). n es el número de propuestas en que se compara a ese partido. La cercanía esperada al azar es la media de la cercanía con las cinco respuestas posibles. La corrección por azar sigue la idea del coeficiente de Cohen (1960); ver <a href="#/fuentes">Fuentes</a>.</p></details>' +

      '<h2 id="m-importante">Las propuestas que te importan mucho</h2>' +
      "<p>Si marcas «Esto me importa mucho» en una propuesta, esa propuesta cuenta el doble en la media. Sirve para que el resultado refleje tus prioridades: no es lo mismo coincidir con un partido en lo que más te importa que en un tema secundario.</p>" +
      "<p>Si no la marcas en ninguna, todas cuentan igual. Y las que respondes con «No lo sé» no cuentan nunca.</p>" +

      '<h2 id="m-empate">Empate técnico</h2>' +
      "<p>Cuando dos partidos quedan muy cerca, el ganador puede depender de una o dos respuestas. Para detectarlo, repetimos tu cálculo " + D.parametros.bootstrap.toLocaleString("es") +
      " veces con combinaciones al azar de tus propias respuestas (técnica <em>bootstrap</em>). Si el primero no queda primero en al menos el " + Math.round(D.parametros.umbral_empate * 100) +
      " % de las repeticiones, te indicamos empate técnico en lugar de un ganador.</p>" +

      '<h2 id="m-controles">Controles de calidad</h2>' +
      "<p>Una herramienta neutral no se afirma, se comprueba. Antes de publicar cualquier versión de los datos, el cálculo se somete a seis controles con usuarios simulados por ordenador. Si alguno no se supera, no se publica: se revisa la selección de propuestas. Esta versión los superó todos el " + fecha + ".</p>" +
      '<ul class="controles">' + controles + "</ul>" +
      '<p class="peq tenue">Las simulaciones usan una semilla fija (' + v.semilla + "), así que cualquiera puede repetirlas y obtener los mismos números con el código público.</p>" +

      '<h2 id="m-privacidad">Privacidad</h2>' +
      "<p>Las opiniones políticas son datos especialmente protegidos por el Reglamento General de Protección de Datos. Por eso esta web no las recoge: no hay servidor, base de datos, cookies ni estadísticas de visitas. Todo el cálculo se hace en tu navegador y, al cerrar la página, tus respuestas desaparecen.</p>" +
      '<div class="fila-botones" style="margin-top:2.5rem"><a class="boton" href="#/test">Hacer el test</a><a href="#/fuentes">Ver fuentes</a></div></article>';
    app.focus({ preventScroll: true });
  }

  // ---------- fuentes ----------
  function pintarFuentes() {
    var programas = D.partidos.map(function (p) {
      return '<li><span class="ft">' + esc(p.nombre) + "</span> — " + esc(p.programa) +
        '<span class="fu"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.url) + "</a></span></li>";
    }).join("");
    var refs = (D.referencias || []).map(function (r) {
      return '<li><span class="ft">' + esc(r.autores) + " (" + esc(r.anio) + ").</span> " + esc(r.titulo) + ". <em>" + esc(r.publicacion) + "</em>." +
        '<span class="fu">' + esc(r.uso) + (r.url ? ' <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.url) + "</a>" : "") + "</span></li>";
    }).join("");
    var c = D.config;

    app.innerHTML =
      '<article class="pagina"><h1>Fuentes</h1>' +
      '<p class="lead">De dónde sale cada propuesta y cada postura, y en qué nos basamos para diseñar el cálculo.</p>' +
      "<h2>Programas electorales</h2>" +
      "<p>Todas las propuestas y todas las citas se han copiado literalmente de estos documentos. En tus resultados, cada una enlaza a su página exacta. Los números de página corresponden a la página del archivo PDF, que es la que abre el enlace.</p>" +
      '<ul class="lista-fuentes">' + programas + "</ul>" +
      "<h2>Datos descargables</h2>" +
      '<ul class="lista-fuentes">' +
      '<li><span class="ft"><a href="datos/datos.xlsx">datos.xlsx</a></span><span class="fu">Las ' + N + " propuestas, la postura de cada partido, sus citas y sus páginas.</span></li>" +
      '<li><span class="ft"><a href="validacion.md">validacion.md</a></span><span class="fu">Informe técnico de los controles de calidad de esta versión.</span></li>' +
      (c.repositorio ? '<li><span class="ft"><a href="' + esc(c.repositorio) + '" target="_blank" rel="noopener">Repositorio público</a></span><span class="fu">Código de la web, del cálculo y de las simulaciones, con el historial de todos los cambios.</span></li>' : "") +
      "</ul>" +
      "<h2>Referencias metodológicas</h2>" +
      '<ul class="lista-fuentes">' + refs + "</ul>" +
      '<div class="fila-botones" style="margin-top:2.5rem"><a class="boton" href="#/test">Hacer el test</a><a href="#/metodologia">Ver metodología</a></div></article>';
    app.focus({ preventScroll: true });
  }

  // ---------- arranque ----------
  document.title = D.config.titulo + " — ¿Qué programa se parece más a lo que piensas?";
  render();
})();
