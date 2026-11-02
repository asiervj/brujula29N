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
  var REPETICIONES = D.parametros.bootstrap.toLocaleString("es-ES");
  var UMBRAL = Math.round(D.parametros.umbral_empate * 100);

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
  function pct(x) { return Math.round(x) + "\u00a0%"; }
  function etiqueta(v) {
    for (var i = 0; i < ESCALA.length; i++) if (ESCALA[i].v === v) return ESCALA[i].t;
    return "";
  }
  function nombre(id) { return PARTIDO[id] ? PARTIDO[id].nombre : id; }
  function externo(url, texto) {
    // noreferrer: algunos servidores rechazan los enlaces que llegan desde otra web
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + texto + "</a>";
  }
  function refHTML(id, pagina, apartado) {
    var p = PARTIDO[id];
    if (!p) return "";
    var txt = esc(p.programa) + (apartado ? ", " + esc(apartado) : "") + (pagina ? ", p. " + pagina : "");
    return externo(p.url + (pagina ? "#page=" + pagina : ""), txt);
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
      if (a.getAttribute("data-nav") === ruta.replace("/", "")) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var navTest = document.getElementById("nav-test");
    navTest.textContent = ruta !== "/test" && testEmpezado() && estado.idx < estado.orden.length ? "Continuar el test" : "Hacer el test";
    navTest.style.visibility = ruta === "/test" ? "hidden" : "visible";

    if (seccion) { var el = document.getElementById(seccion); if (el) el.scrollIntoView(); }
    else window.scrollTo(0, 0);
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
    var empezar = testEmpezado() ? "Continuar el test" : "Empezar el test";
    var faq = [
      ["¿Recomienda a qué partido votar?",
        "No. Indica el grado de coincidencia entre tus respuestas y las propuestas de cada partido. La decisión de voto corresponde exclusivamente a cada persona."],
      ["¿Cómo se garantiza la neutralidad?",
        "Mediante tres mecanismos verificables: las propuestas son literales y enlazan a su página del programa; todos los partidos aportan el mismo número de propuestas (" + POR_PARTIDO + "); y el cálculo supera seis controles de calidad antes de cada publicación. El detalle figura en la <a href=\"#/metodologia\">metodología</a>."],
      ["¿Por qué se incluyen estos partidos?", esc(c.nota_partidos)],
      ["¿Qué efecto tiene marcar una propuesta como importante?",
        "La propuesta recibe doble peso en el cálculo del resultado. Así, la coincidencia en los asuntos que cada persona considera prioritarios influye más que la coincidencia en el resto. Si no se marca ninguna, todas las propuestas pesan lo mismo."],
      ["¿Qué significa «empate técnico»?",
        "Que la diferencia entre los dos primeros partidos es demasiado pequeña para considerarse concluyente, porque depende de una o dos respuestas. En ese caso, en lugar de señalar un único partido, el resultado indica el empate."],
      ["¿Qué ocurre si un partido no se pronuncia sobre una propuesta?",
        "No se le atribuye ninguna postura y esa propuesta no interviene en su cálculo. El resultado indica en cuántas propuestas se ha podido comparar a cada partido."],
      ["¿Qué se hace con las respuestas?",
        "Nada. Las respuestas no salen del dispositivo: no existe registro, base de datos, cookies ni medición de audiencia. Al cerrar la página, se eliminan."],
      ["¿Se pueden consultar los datos?",
        "Sí. En los resultados se muestra, para cada propuesta, la cita del programa en la que se basa la postura de cada partido. La tabla completa puede descargarse en <a href=\"#/fuentes\">Fuentes</a>."]
    ];
    var contacto = [];
    if (c.contacto) contacto.push('Correo: <a href="mailto:' + esc(c.contacto) + '">' + esc(c.contacto) + "</a>");
    if (c.linkedin) contacto.push("LinkedIn: " + externo(c.linkedin, esc(c.autoria || "perfil")));
    if (c.repositorio) contacto.push("Código y datos: " + externo(c.repositorio, "repositorio público"));

    app.innerHTML =
      '<section class="heroe"><div class="heroe-in"><div>' +
      "<h1>¿Qué programa se parece más a lo que piensas?</h1>" +
      '<p class="lead">Valora propuestas extraídas literalmente de los programas electorales sin saber qué partido las formula. Al terminar, verás tu grado de coincidencia con cada partido y en qué se basa cada resultado.</p>' +
      '<div class="fila-botones"><a class="boton" href="#/test">' + empezar + '</a>' +
      '<a class="boton claro" href="#/como-funciona">Cómo funciona</a></div>' +
      '<p class="nota">El test consta de ' + N + " propuestas y requiere unos " + MINUTOS + " minutos. No es necesario registrarse y las respuestas no se almacenan.</p>" +
      "</div>" + brujulaSVG() + "</div></section>" +

      '<section class="seccion alterna" id="como-funciona"><div class="contenido">' +
      '<div class="cab-seccion"><h2>Cómo funciona</h2><p class="lead">El test se desarrolla en tres pasos.</p></div>' +
      '<ol class="pasos">' +
      '<li class="paso"><h3>Lectura</h3><p>Cada propuesta reproduce literalmente un fragmento de un programa electoral. El partido que la formula no se muestra hasta el final. Cada partido aporta ' + POR_PARTIDO + " propuestas.</p></li>" +
      '<li class="paso"><h3>Valoración</h3><p>Cada propuesta se valora en una escala de cinco niveles, de «muy en contra» a «muy a favor». Las propuestas marcadas como importantes tienen doble peso en el cálculo.</p></li>' +
      '<li class="paso"><h3>Resultado</h3><p>Se muestra el grado de coincidencia con cada partido y, para cada propuesta, su autoría, su referencia en el programa y la postura del resto de partidos, con la cita que la fundamenta.</p></li>' +
      "</ol>" +
      '<div class="simulador" id="simulador"></div>' +
      "</div></section>" +

      '<section class="seccion" id="neutralidad"><div class="contenido">' +
      '<div class="cab-seccion"><h2>Garantías de neutralidad</h2><p class="lead">Una herramienta de orientación de voto solo es útil si es imparcial. Estos son los criterios que se aplican.</p></div>' +
      '<div class="principios">' +
      '<div class="principio"><h3>Texto literal y verificable</h3><p>Las propuestas no se resumen ni se reformulan. Cada una indica el programa y la página de procedencia, con enlace al documento original.</p></div>' +
      '<div class="principio"><h3>Igual peso para cada partido</h3><p>Todos los partidos aportan el mismo número de propuestas (' + POR_PARTIDO + "), con independencia de la extensión de su programa.</p></div>" +
      '<div class="principio"><h3>Validación previa a la publicación</h3><p>El método de cálculo se somete a seis controles con miles de usuarios simulados. Una versión solo se publica si los supera todos. <a href="#/metodologia">Ver los controles</a>.</p></div>' +
      '<div class="principio"><h3>Privacidad</h3><p>No hay registro, base de datos ni cookies. El cálculo se realiza íntegramente en el navegador de cada persona.</p></div>' +
      "</div></div></section>" +

      '<section class="seccion oscura" id="nosotros"><div class="contenido dos-col">' +
      "<div><h2>Objetivo</h2>" +
      "<p>Los programas electorales son documentos extensos que pocas personas leen de forma íntegra. Brújula 29N facilita el acceso directo a lo que proponen los partidos, sin intermediarios ni interpretaciones.</p>" +
      "<p>La herramienta no recomienda el voto: muestra el grado de coincidencia con cada programa para que cada persona extraiga sus propias conclusiones.</p></div>" +
      "<div><h2>Quiénes somos</h2><p>" + esc(c.quienes_somos) + "</p>" +
      (contacto.length ? "<p>Para comunicar un error en una cita o en la postura asignada a un partido, o para cualquier consulta:</p><p>" + contacto.join("<br>") + "</p>" : "") +
      "</div></div></section>" +

      '<section class="seccion" id="preguntas"><div class="contenido"><div style="max-width:var(--lectura)">' +
      '<div class="cab-seccion"><h2>Preguntas frecuentes</h2></div><div class="faq">' +
      faq.map(function (f) { return "<details><summary>" + f[0] + '</summary><div class="resp">' + f[1] + "</div></details>"; }).join("") +
      "</div></div></div></section>" +

      '<section class="seccion alterna llamada"><div class="llamada-in"><h2>El test requiere unos ' + MINUTOS + " minutos.</h2>" +
      '<a class="boton" href="#/test">' + empezar + "</a></div></section>";

    pintarSimulador();
  }

  // Ejemplo interactivo: cercanía entre una respuesta y la postura de cada partido.
  var sim = { u: 1, imp: false };
  function pintarSimulador() {
    var caja = document.getElementById("simulador");
    if (!caja) return;
    var partidosEj = [["Partido A", 2], ["Partido B", 0], ["Partido C", -1]];
    var filas = partidosEj.map(function (p) {
      var cerca = 100 * (1 - Math.abs(sim.u - p[1]) / 4);
      return '<div class="mini-fila"><span class="nom">' + p[0] + "<small>" + etiqueta(p[1]) + "</small></span>" +
        '<span class="pista" aria-hidden="true"><span style="width:' + cerca + '%"></span></span>' +
        '<span class="val">' + pct(cerca) + "</span></div>";
    }).join("");
    caja.innerHTML =
      "<div><h3>Ejemplo de cálculo</h3>" +
      '<p class="tenue">Propuesta ficticia y tres partidos con posturas distintas. Selecciona una respuesta para ver la cercanía con cada uno.</p>' +
      '<p class="ejemplo">«Ampliar el horario de las bibliotecas públicas.»</p>' +
      '<div class="opciones-mini" role="group" aria-label="Respuesta de ejemplo">' +
      ESCALA.map(function (o) { return '<button type="button" data-v="' + o.v + '" aria-pressed="' + (sim.u === o.v) + '">' + o.t + "</button>"; }).join("") +
      "</div>" +
      '<label class="importa" style="margin-top:1rem;display:inline-flex"><input type="checkbox" id="sim-imp"' + (sim.imp ? " checked" : "") + "> Esto me importa mucho <small>(cuenta el doble)</small></label></div>" +
      '<div class="resultado-mini" aria-live="polite"><p class="peq tenue" style="margin-bottom:.4rem">Cercanía en esta propuesta</p>' + filas +
      '<p class="explica-mini">' + (sim.imp
        ? "Al marcarla como importante, esta propuesta tendrá doble peso en el promedio final."
        : "La cercanía es del 100 % cuando la respuesta coincide con la postura del partido y del 0 % cuando es la opuesta.") +
      " El resultado final promedia todas las propuestas respondidas y lo compara con el que se obtendría respondiendo al azar.</p></div>";
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
      app.innerHTML = '<div class="pantalla"><h1>Respuestas insuficientes</h1>' +
        "<p>Has valorado " + n + " propuestas. Para obtener un resultado fiable se necesitan al menos " + min +
        ". Puedes revisar las propuestas que marcaste como «no lo sé».</p>" +
        '<div class="fila-botones"><button class="boton" id="revisar">Revisar las propuestas</button>' +
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
      ? '<p class="tit">Mayor coincidencia: ' + esc(nombre(p1.id)) + ".</p>" +
        "<p>El resultado es sólido: al repetir el cálculo " + REPETICIONES + " veces con distintas combinaciones de tus respuestas, " +
        esc(nombre(p1.id)) + " ocupa el primer lugar en el " + pct(100 * p1.cuota) + " de los casos.</p>"
      : '<p class="tit">Empate técnico entre ' + esc(nombre(p1.id)) + " y " + esc(nombre(p2.id)) + ".</p>" +
        "<p>" + esc(nombre(p1.id)) + " obtiene la mayor coincidencia, pero al repetir el cálculo " + REPETICIONES +
        " veces con distintas combinaciones de tus respuestas solo ocupa el primer lugar en el " + pct(100 * p1.cuota) + " de los casos. La diferencia depende de muy pocas propuestas.</p>";

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
      '<p class="leyenda-azar"><i aria-hidden="true"></i><span>La línea vertical marca el 50 %, la coincidencia esperable respondiendo al azar.' +
      (nImp ? " " + (nImp === 1 ? "La propuesta marcada como importante ha tenido" : "Las " + nImp + " propuestas marcadas como importantes han tenido") + " doble peso." : "") + "</span></p>" +
      '<div class="fila-botones"><button class="boton claro" id="otra-vez">Repetir el test</button><a href="#/metodologia">Cómo se calcula</a></div>' +

      '<section class="bloque-desglose"><h2>Propuesta a propuesta</h2>' +
      "<p>Para cada propuesta se muestran su autoría, su referencia en el programa y la postura de cada partido. En «Fundamento de cada postura» figura la cita del programa en la que se basa.</p>" +
      '<div class="filtros">' +
      '<label>Tema<select id="f-tema"><option value="">Todos</option>' +
      temas.map(function (t) { return '<option value="' + esc(t) + '"' + (estado.filtroTema === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") +
      "</select></label>" +
      '<label>Resaltar partido<select id="f-partido"><option value="">Ninguno</option>' +
      D.partidos.map(function (p) { return '<option value="' + esc(p.id) + '"' + (estado.resaltar === p.id ? " selected" : "") + ">" + esc(p.nombre) + "</option>"; }).join("") +
      "</select></label>" +
      '<button class="boton-texto" id="abrir-todas">' + (estado.abiertas ? "Ocultar todas las citas" : "Mostrar todas las citas") + "</button></div>" +
      '<div class="leyenda-regla"><span><i class="lp"></i>Postura de cada partido según su programa</span><span><i class="la"></i>Partido que formula la propuesta</span><span><i class="lt"></i>Tu respuesta</span></div>' +
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
        ? '<span class="silencio">Sin pronunciamiento en su programa</span>'
        : ESCALA.map(function (o) {
            return '<span class="celda">' + (o.v === po.v ? '<span class="marca-p" title="' + esc(etiqueta(po.v)) + '"></span>' : "") + "</span>";
          }).join("");
      return '<div class="' + cls + '"><span class="pn">' + esc(p.nombre) + "</span>" + dentro + "</div>";
    }).join("");

    var accesible = D.partidos.map(function (p) {
      var v = q.posturas[p.id] ? q.posturas[p.id].v : null;
      return p.nombre + ": " + (v == null ? "sin pronunciamiento" : etiqueta(v).toLowerCase());
    }).join("; ") + ". Tu respuesta: " + (uv == null ? "ninguna" : etiqueta(uv).toLowerCase()) + ".";

    var tuRespuesta = !r ? "No respondiste a esta propuesta."
      : r.v == null ? "Respondiste <strong>no lo sé</strong>: esta propuesta no interviene en tu resultado."
      : "Respondiste <strong>" + etiqueta(r.v).toLowerCase() + "</strong>" + (r.imp ? " y la marcaste como importante, por lo que ha tenido doble peso" : "") + ".";

    var justif = D.partidos.map(function (p) {
      var po = q.posturas[p.id] || {};
      var esAutor = p.id === q.autor;
      var cuerpo = po.v == null
        ? '<span class="tenue">Su programa no se pronuncia sobre esta cuestión, por lo que no se le compara en esta propuesta.</span>'
        : '<span class="jpos">' + esc(etiqueta(po.v)) + (esAutor ? " · autor de la propuesta" : "") + "</span><br>" +
          (esAutor ? '<span class="tenue">Formula la propuesta en su programa.</span>' : "<q>" + esc(po.cita) + "</q>") +
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
      '<details class="justif"' + (estado.abiertas ? " open" : "") + "><summary>Fundamento de cada postura</summary>" +
      '<ul class="justif-lista">' + justif + "</ul></details>" +
      "</li>";
  }

  // ---------- metodología ----------
  var EXPLICA = {
    "Coincidencia perfecta": "Se simula, para cada partido, a una persona cuyas respuestas coinciden exactamente con las posturas de su programa. El test debe asignarle ese partido.",
    "Votante realista": "Se simulan 5.000 personas por partido con posiciones próximas a las de ese partido, pero no idénticas: parte de sus respuestas se desvían un nivel y otras quedan sin responder. La gran mayoría debe obtener ese partido como resultado.",
    "Respuestas aleatorias": "Se simulan 100.000 personas que responden al azar. Ningún partido debe resultar favorecido: todos deben ocupar el primer puesto con una frecuencia similar.",
    "Respuesta uniforme": "Se simulan personas que eligen siempre la misma respuesta. No deben quedar asignadas con claridad a ningún partido.",
    "Influencia de una sola propuesta": "Se elimina cada propuesta de una en una y se repite el cálculo. Ninguna debe alterar por sí sola el resultado.",
    "Robustez del método": "Se repite el cálculo con una medida de distancia alternativa. El partido con mayor coincidencia debe ser el mismo en la práctica totalidad de los casos."
  };

  function mi(x) { return "<mi>" + x + "</mi>"; }
  function mn(x) { return "<mn>" + x + "</mn>"; }
  function mo(x) { return "<mo>" + x + "</mo>"; }
  function arg(x) { return '<mo stretchy="false">(</mo>' + x + '<mo stretchy="false">)</mo>'; }
  function frac(a, b) { return "<mfrac><mrow>" + a + "</mrow><mrow>" + b + "</mrow></mfrac>"; }
  function sub(a, b) { return "<msub>" + a + b + "</msub>"; }
  function abs(x) { return '<mrow><mo stretchy="false">|</mo>' + x + '<mo stretchy="false">|</mo></mrow>'; }
  function ecuacion(cuerpo, etiquetaEc) {
    return '<div class="ecuacion"><math display="block"><mrow>' + cuerpo + "</mrow></math>" +
      (etiquetaEc ? '<span class="ec-num">(' + etiquetaEc + ")</span>" : "") + "</div>";
  }

  function formulas() {
    var ci = sub(mi("c"), mi("i")), ri = sub(mi("r"), mi("i")), pi = sub(mi("p"), mi("i")),
        wi = sub(mi("w"), mi("i")), ki = sub(mi("κ"), mi("i"));
    var cbar = '<mover><mi>c</mi><mo>‾</mo></mover>';
    var k = D.parametros.k;
    return '<div class="formula">' +
      ecuacion(ci + mo("=") + mn("1") + mo("−") + frac(abs(ri + mo("−") + pi), mn("4")), "1") +
      ecuacion(cbar + arg(mi("p")) + mo("=") + frac(mn("1"), mn("5")) +
        '<munderover><mo>∑</mo><mrow><mi>r</mi><mo>=</mo><mo>−</mo><mn>2</mn></mrow><mn>2</mn></munderover>' +
        mo("(") + mn("1") + mo("−") + frac(abs(mi("r") + mo("−") + mi("p")), mn("4")) + mo(")"), "2") +
      ecuacion(ki + mo("=") + frac(ci + mo("−") + cbar + arg(pi), mn("1") + mo("−") + cbar + arg(pi)), "3") +
      ecuacion(mi("C") + mo("=") + mn("50") + mo("+") + mn("50") + mo("·") +
        frac('<munder><mo>∑</mo><mi>i</mi></munder>' + wi + ki, '<munder><mo>∑</mo><mi>i</mi></munder>' + wi), "4") +
      ecuacion(mi("R") + mo("=") + frac(mi("n") + mo("·") + mi("C") + mo("+") + mn(k) + mo("·") + mn("50"), mi("n") + mo("+") + mn(k)), "5") +
      "</div>" +
      '<table class="tabla-esc leyenda-formula"><tbody>' +
      "<tr><td><math>" + ri + "</math></td><td>Respuesta a la propuesta <em>i</em>, de −2 (muy en contra) a +2 (muy a favor).</td></tr>" +
      "<tr><td><math>" + pi + "</math></td><td>Postura del partido sobre la propuesta <em>i</em>, en la misma escala.</td></tr>" +
      "<tr><td><math>" + ci + "</math></td><td>Cercanía entre respuesta y postura: 1 si coinciden, 0 si ocupan extremos opuestos.</td></tr>" +
      "<tr><td><math>" + cbar + arg(mi("p")) + "</math></td><td>Cercanía esperada al azar para una postura <em>p</em>: media de la cercanía con las cinco respuestas posibles.</td></tr>" +
      "<tr><td><math>" + ki + "</math></td><td>Cercanía corregida por azar: 1 si coinciden, 0 si es la esperable al azar, negativa si es inferior.</td></tr>" +
      "<tr><td><math>" + wi + "</math></td><td>Peso de la propuesta: 2 si se ha marcado como importante y 1 en caso contrario.</td></tr>" +
      "<tr><td><math><mi>C</mi></math></td><td>Coincidencia, en porcentaje: 100 % equivale a coincidencia plena y 50 % a la esperable al azar.</td></tr>" +
      "<tr><td><math><mi>n</mi></math></td><td>Número de propuestas en que se compara al partido (respondidas y con postura del partido).</td></tr>" +
      "<tr><td><math><mi>R</mi></math></td><td>Resultado final, con el ajuste por número de comparaciones (<em>k</em> = " + k + ").</td></tr>" +
      "</tbody></table>" +
      '<p class="peq tenue">Solo intervienen las propuestas respondidas (excluidas las respuestas «no lo sé») sobre las que el partido se pronuncia. La corrección por azar sigue el planteamiento del coeficiente de acuerdo de Cohen (1960).</p>';
  }

  function pintarMetodologia() {
    var v = D.validacion;
    var controles = v.pruebas.map(function (p) {
      return '<li class="control"><div class="control-cab"><h3>' + esc(p.prueba) + "</h3>" +
        (p.ok ? '<span class="sello">' + CHECK + "Superado</span>" : '<span class="sello" style="color:var(--texto);background:var(--fondo-2)">No superado</span>') + "</div>" +
        "<p>" + esc(EXPLICA[p.prueba] || p.que) + "</p>" +
        '<p class="res"><strong>Criterio:</strong> ' + esc(p.criterio) + "<br><strong>Resultado:</strong> " + esc(p.resultado) + "</p></li>";
    }).join("");
    var fecha = v.fecha.split(" ")[0].split("-").reverse().join("/");

    app.innerHTML =
      '<article class="pagina"><h1>Metodología</h1>' +
      '<p class="lead">Criterios de selección de las propuestas, asignación de posturas y cálculo del resultado.</p>' +
      '<div class="resumen"><p class="resumen-tit">En síntesis</p><ul>' +
      "<li>Cada programa aporta " + POR_PARTIDO + " propuestas literales, con su referencia de página.</li>" +
      "<li>La postura de cada partido se asigna a partir de una cita de su propio programa.</li>" +
      "<li>El resultado mide la coincidencia entre las respuestas y esas posturas, corregida por el efecto del azar.</li>" +
      "<li>Antes de cada publicación, el cálculo supera seis controles de calidad.</li>" +
      "<li>Las respuestas no se almacenan.</li></ul></div>" +
      '<nav class="indice" aria-label="En esta página"><a href="#m-partidos">1. Partidos</a><a href="#m-propuestas">2. Propuestas</a><a href="#m-posturas">3. Posturas</a><a href="#m-calculo">4. Cálculo</a><a href="#m-importante">5. Propuestas importantes</a><a href="#m-empate">6. Empate técnico</a><a href="#m-controles">7. Controles de calidad</a><a href="#m-privacidad">8. Privacidad</a></nav>' +

      '<h2 id="m-partidos">1. Partidos incluidos</h2><p>' + esc(D.config.nota_partidos) + "</p>" +

      '<h2 id="m-propuestas">2. Selección de las propuestas</h2>' +
      "<p>Cada programa aporta " + POR_PARTIDO + " propuestas, de modo que todos los partidos tienen la misma presencia en el test. Cada propuesta debe cumplir los siguientes criterios:</p><ul>" +
      "<li><strong>Concreción.</strong> Debe tratarse de una medida verificable, no de una declaración de intenciones.</li>" +
      "<li><strong>Capacidad de discriminación.</strong> Los partidos deben mantener posturas diferentes sobre ella.</li>" +
      "<li><strong>Neutralidad formal.</strong> No menciona partidos, dirigentes ni adversarios, ni emplea expresiones características de un partido. Se evitan, en la medida de lo posible, las propuestas emblemáticas que permiten identificar de inmediato a su autor.</li>" +
      "<li><strong>Comprensibilidad.</strong> Debe poder entenderse de forma aislada. Los términos técnicos se explican en una aclaración separada del texto original.</li></ul>" +
      "<p><strong>Integridad del texto.</strong> El texto no se reformula. Las frases extensas se recortan y el corte se señala con […]. El único cambio admitido es sustituir un nombre propio por una referencia entre corchetes. Los fragmentos escritos en mayúsculas en el original se transcriben en minúsculas, sin alterar ninguna palabra. Las aclaraciones describen la situación vigente en la fecha de publicación de los programas.</p>" +
      "<p><strong>Equilibrio.</strong> Las propuestas se distribuyen entre distintos ámbitos temáticos e incluyen pares de signo contrario sobre un mismo asunto, de modo que la tendencia a responder siempre de forma afirmativa no favorezca a ningún partido. Se presentan en un orden aleatorio, distinto para cada persona, para evitar efectos de orden.</p>" +

      '<h2 id="m-posturas">3. Asignación de posturas</h2>' +
      "<p>Para cada propuesta se registra la postura de todos los partidos, no únicamente la de su autor. De este modo, mostrar acuerdo con una propuesta aproxima el resultado a los partidos que la apoyan y lo aleja de los que la rechazan.</p>" +
      '<table class="tabla-esc"><thead><tr><th>Postura</th><th>Criterio de asignación</th></tr></thead><tbody>' +
      "<tr><td>Muy a favor</td><td>El partido formula la propuesta o la respalda expresamente. Es siempre la postura del autor.</td></tr>" +
      "<tr><td>A favor</td><td>El partido respalda la propuesta con matices o formula una medida equivalente.</td></tr>" +
      "<tr><td>Neutral</td><td>El programa recoge una posición intermedia.</td></tr>" +
      "<tr><td>En contra</td><td>El partido formula una medida incompatible con la propuesta.</td></tr>" +
      "<tr><td>Muy en contra</td><td>El partido rechaza expresamente la propuesta o defiende la medida opuesta.</td></tr>" +
      "<tr><td>Sin pronunciamiento</td><td>El programa no aborda la cuestión. No se atribuye postura y el partido no se compara en esa propuesta.</td></tr></tbody></table>" +
      "<p>Toda postura está respaldada por una cita literal del programa del partido, con indicación de página. Las citas pueden consultarse en los resultados y descargarse en <a href=\"#/fuentes\">Fuentes</a>.</p>" +

      '<h2 id="m-calculo">4. Cálculo del resultado</h2>' +
      "<p>El cálculo se realiza en tres pasos.</p><ol>" +
      "<li><strong>Cercanía en cada propuesta.</strong> Se mide la distancia entre la respuesta y la postura del partido en la escala de cinco niveles. La cercanía vale 1 cuando coinciden y 0 cuando ocupan extremos opuestos.</li>" +
      "<li><strong>Corrección por azar.</strong> La cercanía obtenida se compara con la que cabría esperar si se respondiera al azar. Sin esta corrección, los partidos con posturas intermedias obtendrían sistemáticamente una coincidencia más alta, porque una posición central está, en promedio, más próxima a cualquier respuesta. Tras la corrección, un 50 % equivale al resultado esperable por azar y un 100 %, a la coincidencia plena.</li>" +
      "<li><strong>Ajuste por número de comparaciones.</strong> Si un partido no se pronuncia sobre varias propuestas, su resultado se apoya en menos comparaciones y es menos fiable. Para evitar que ocupe los primeros puestos por efecto del azar, su porcentaje se aproxima ligeramente al 50 %, tanto más cuantas menos comparaciones haya.</li></ol>" +
      '<details class="mas"><summary>Ver las fórmulas</summary>' + formulas() + "</details>" +

      '<h2 id="m-importante">5. Propuestas marcadas como importantes</h2>' +
      "<p>Al marcar «Esto me importa mucho», la propuesta recibe un peso doble en el cálculo. El objetivo es que el resultado refleje las prioridades de cada persona: coincidir con un partido en los asuntos considerados prioritarios pesa más que coincidir en asuntos secundarios.</p>" +
      "<p>Si no se marca ninguna propuesta, todas tienen el mismo peso. Las propuestas respondidas con «No lo sé» no intervienen en el cálculo.</p>" +

      '<h2 id="m-empate">6. Empate técnico</h2>' +
      "<p>Cuando dos partidos obtienen resultados próximos, el orden entre ellos puede depender de muy pocas respuestas. Para medir la solidez del resultado, el cálculo se repite " + REPETICIONES +
      " veces sobre muestras aleatorias de las propias respuestas (remuestreo <em>bootstrap</em>; Efron y Tibshirani, 1993). Si el partido con mayor coincidencia no ocupa el primer lugar en al menos el " + UMBRAL +
      " % de las repeticiones, se indica empate técnico en lugar de un único resultado.</p>" +

      '<h2 id="m-controles">7. Controles de calidad</h2>' +
      "<p>La neutralidad del método se verifica mediante simulación por ordenador (método de Monte Carlo). Antes de publicar cualquier versión de los datos, el cálculo se somete a seis controles con usuarios simulados. Una versión solo se publica si los supera todos; en caso contrario, se revisa la selección de propuestas, nunca la fórmula de cálculo.</p>" +
      "<p>La versión actual superó todos los controles el " + fecha + ".</p>" +
      '<ul class="controles">' + controles + "</ul>" +
      '<p class="peq tenue">Las simulaciones utilizan una semilla aleatoria fija (' + v.semilla + "), de modo que cualquier persona puede reproducirlas con el código público y obtener los mismos resultados.</p>" +

      '<h2 id="m-privacidad">8. Privacidad</h2>' +
      "<p>Las opiniones políticas constituyen una categoría especial de datos personales según el Reglamento General de Protección de Datos (art. 9). Por ello, la herramienta no recoge ninguna respuesta: no utiliza servidor, base de datos, cookies ni herramientas de medición de audiencia. El cálculo se realiza íntegramente en el navegador y las respuestas se eliminan al cerrar la página.</p>" +
      '<div class="fila-botones" style="margin-top:2.5rem"><a class="boton" href="#/test">Hacer el test</a><a href="#/fuentes">Ver fuentes</a></div></article>';
    app.focus({ preventScroll: true });
  }

  // ---------- fuentes ----------
  function pintarFuentes() {
    var programas = D.partidos.map(function (p) {
      return '<li><span class="ft">' + esc(p.nombre) + "</span>. " + esc(p.programa) + "." +
        '<span class="fu">' + externo(p.url, esc(p.url)) + "</span></li>";
    }).join("");
    var refs = (D.referencias || []).map(function (r) {
      return '<li><span class="ft">' + esc(r.autores) + " (" + esc(r.anio) + ").</span> " + esc(r.titulo) + ". <em>" + esc(r.publicacion) + "</em>." +
        '<span class="fu">' + esc(r.uso) + (r.url ? " " + externo(r.url, esc(r.url)) : "") + "</span></li>";
    }).join("");
    var c = D.config;

    app.innerHTML =
      '<article class="pagina"><h1>Fuentes</h1>' +
      '<p class="lead">Procedencia de las propuestas y de las posturas, y referencias del método de cálculo.</p>' +
      "<h2>Programas electorales</h2>" +
      "<p>Todas las propuestas y citas reproducen literalmente estos documentos. La numeración de páginas corresponde a la del archivo PDF, que es la que abre cada enlace.</p>" +
      '<ul class="lista-fuentes">' + programas + "</ul>" +
      "<h2>Datos descargables</h2>" +
      '<ul class="lista-fuentes">' +
      '<li><span class="ft"><a href="datos/datos.xlsx">datos.xlsx</a></span><span class="fu">Las ' + N + " propuestas, la postura de cada partido y las citas y páginas que la fundamentan.</span></li>" +
      '<li><span class="ft"><a href="validacion.md">validacion.md</a></span><span class="fu">Informe técnico de los controles de calidad de esta versión.</span></li>' +
      (c.repositorio ? '<li><span class="ft">' + externo(c.repositorio, "Repositorio público") + '</span><span class="fu">Código de la web, del cálculo y de las simulaciones, con el historial completo de cambios.</span></li>' : "") +
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
