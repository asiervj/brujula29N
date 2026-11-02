"""Brújula 29N — construye la web a partir de datos/datos.xlsx.

Qué hace, en orden:
  1. Lee el Excel y comprueba que está bien rellenado (si hay errores, para).
  2. Ejecuta las pruebas de neutralidad con usuarios simulados (Monte Carlo).
  3. Si Node.js está instalado, comprueba que la web calcula igual que este script.
  4. Escribe validacion.md (informe) y, SOLO si todo está bien, actualiza data.js
     (lo que lee la web). Si algo falla, data.js no se toca y la web sigue con
     los últimos datos válidos.

Uso (desde la carpeta del proyecto):
    python scripts/construir.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
EXCEL = RAIZ / "datos" / "datos.xlsx"
SALIDA_JS = RAIZ / "data.js"
INFORME = RAIZ / "validacion.md"
CASOS = RAIZ / "scripts" / "casos_prueba.json"
CANDIDATO = RAIZ / "scripts" / "data_candidato.js"

SEMILLA = 29
K_ENCOGIMIENTO = 3          # preguntas "imaginarias" al 50 % (corrección por casillas vacías)
MAX_PALABRAS = 40
POSTURAS_VALIDAS = {-2, -1, 0, 1, 2}

errores: list[str] = []
avisos: list[str] = []


# ---------------------------------------------------------------------------
# 1. Lectura y comprobación del Excel
# ---------------------------------------------------------------------------
def texto(v) -> str:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return ""
    return str(v).strip()


def entero(v):
    t = texto(v)
    if not t:
        return None
    try:
        return int(float(t))
    except ValueError:
        return None


def leer_excel():
    if not EXCEL.exists():
        sys.exit(f"No encuentro {EXCEL}")
    hojas = pd.read_excel(EXCEL, sheet_name=None, dtype=object)
    for h in ("config", "partidos", "propuestas"):
        if h not in hojas:
            sys.exit(f"Falta la hoja '{h}' en el Excel.")

    cfg = {texto(r["clave"]): r["valor"] for _, r in hojas["config"].iterrows() if texto(r["clave"])}
    config = {
        "titulo": texto(cfg.get("titulo")) or "Brújula 29N",
        "eleccion": texto(cfg.get("eleccion")),
        "autoria": texto(cfg.get("autoria")),
        "quienes_somos": texto(cfg.get("quienes_somos")),
        "contacto": texto(cfg.get("contacto")),
        "linkedin": texto(cfg.get("linkedin")),
        "repositorio": texto(cfg.get("repositorio")),
        "min_respuestas": entero(cfg.get("min_respuestas")) or 20,
        "nota_partidos": texto(cfg.get("nota_partidos")),
    }

    partidos = []
    for i, r in hojas["partidos"].iterrows():
        pid, nombre = texto(r.get("id")), texto(r.get("nombre"))
        if not pid and not nombre:
            continue
        fila = i + 2
        if not pid or " " in pid:
            errores.append(f"partidos, fila {fila}: el id '{pid}' no puede estar vacío ni tener espacios.")
        if not nombre:
            errores.append(f"partidos, fila {fila}: falta el nombre.")
        if not texto(r.get("programa")) or not texto(r.get("url")):
            errores.append(f"partidos, fila {fila}: falta el título del programa o su enlace (url).")
        partidos.append({"id": pid, "nombre": nombre, "programa": texto(r.get("programa")),
                         "url": texto(r.get("url")), "nota": texto(r.get("nota"))})
    ids = [p["id"] for p in partidos]
    if len(set(ids)) != len(ids):
        errores.append("partidos: hay ids repetidos.")
    if len(partidos) < 2:
        errores.append("partidos: hacen falta al menos 2 partidos.")

    referencias = []
    if "referencias" in hojas:
        for _, r in hojas["referencias"].iterrows():
            if texto(r.get("titulo")):
                referencias.append({k: texto(r.get(k)) for k in ("autores", "anio", "titulo", "publicacion", "url", "uso")})

    df = hojas["propuestas"]
    for col in ("id", "tema", "texto", "autor", "apartado", "pagina"):
        if col not in df.columns:
            errores.append(f"propuestas: falta la columna '{col}'.")
    for pid in ids:
        for col in (f"{pid} postura", f"{pid} cita", f"{pid} pagina"):
            if col not in df.columns:
                errores.append(f"propuestas: falta la columna '{col}'.")
    if errores:
        return config, partidos, [], referencias

    propuestas, vistos = [], set()
    for i, r in df.iterrows():
        fila = i + 2
        qid, txt = texto(r.get("id")), texto(r.get("texto"))
        if not qid and not txt:
            continue
        donde = f"propuestas, fila {fila} ({qid or 'sin id'})"
        if not qid:
            errores.append(f"{donde}: falta el id.")
        if qid in vistos:
            errores.append(f"{donde}: id repetido.")
        vistos.add(qid)
        if not txt:
            errores.append(f"{donde}: falta el texto.")
        autor = texto(r.get("autor"))
        if autor not in ids:
            errores.append(f"{donde}: el autor '{autor}' no está en la hoja partidos.")
        pagina = entero(r.get("pagina"))
        if pagina is None:
            errores.append(f"{donde}: falta la página del programa donde aparece la propuesta.")

        posturas = {}
        for pid in ids:
            bruto, cita = r.get(f"{pid} postura"), texto(r.get(f"{pid} cita"))
            pag = entero(r.get(f"{pid} pagina"))
            if texto(bruto) == "":
                v = None
            else:
                try:
                    v = int(float(bruto))
                    if v != float(bruto) or v not in POSTURAS_VALIDAS:
                        raise ValueError
                except (TypeError, ValueError):
                    errores.append(f"{donde}: la postura de {pid} es '{bruto}'; solo vale -2, -1, 0, 1, 2 o vacío.")
                    v = None
            if pid == autor:
                # la cita del autor es la propia propuesta
                cita, pag = cita or txt, pag or pagina
            if v is not None and (not cita or pag is None):
                errores.append(f"{donde}: {pid} tiene postura {v} pero le falta la cita o la página que la justifica.")
            posturas[pid] = {"v": v, "cita": cita, "pagina": pag}

        if autor in posturas and posturas[autor]["v"] != 2:
            errores.append(f"{donde}: el autor ({autor}) debe tener postura 2.")

        n_pal = len(txt.split())
        if n_pal > MAX_PALABRAS:
            avisos.append(f"{donde}: tiene {n_pal} palabras (máximo recomendado {MAX_PALABRAS}).")
        vals = [p["v"] for p in posturas.values() if p["v"] is not None]
        if not (any(v >= 1 for v in vals) and any(v <= -1 for v in vals)):
            avisos.append(f"{donde}: ningún partido está en contra (o ninguno a favor); no ayuda a distinguir.")

        propuestas.append({
            "id": qid, "tema": texto(r.get("tema")) or "Otros", "texto": txt,
            "aclaracion": texto(r.get("aclaracion")), "autor": autor,
            "apartado": texto(r.get("apartado")), "pagina": pagina, "posturas": posturas,
        })

    if len(propuestas) < config["min_respuestas"]:
        errores.append(f"Hay {len(propuestas)} propuestas y el mínimo para dar resultado es {config['min_respuestas']}.")

    por_autor = pd.Series([p["autor"] for p in propuestas]).value_counts()
    if por_autor.nunique() > 1:
        avisos.append("No todos los partidos tienen el mismo número de propuestas: " +
                      ", ".join(f"{k} {v}" for k, v in por_autor.items()) + ".")
    for tema, n in pd.Series([p["tema"] for p in propuestas]).value_counts().items():
        if n > 4:
            avisos.append(f"El tema '{tema}' tiene {n} propuestas (recomendado entre 2 y 4).")
    return config, partidos, propuestas, referencias


# ---------------------------------------------------------------------------
# 2. Motor de cálculo (idéntico a motor.js)
# ---------------------------------------------------------------------------
ESCALA = np.arange(-2, 3)
ACUERDO = {
    # acuerdo en una pregunta según la distancia d entre usuario y partido (1 = igual, 0 = opuesto)
    "manhattan": lambda d: 1 - d / 4,
    "euclidea": lambda d: 1 - d ** 2 / 16,
}


def puntuar(U, W, P, metrica="manhattan"):
    """U, W: (usuarios × preguntas); P: (preguntas × partidos). NaN = sin dato.

    Coincidencia corregida por azar: en cada pregunta se compara el acuerdo real con el
    que tendría alguien que respondiera al azar a esa misma postura.
      κ = (acuerdo − acuerdo_azar) / (1 − acuerdo_azar)   → 1 igual, 0 como el azar
      coincidencia = 50 + 50 · media ponderada de κ        → 100 % igual, 50 % como el azar
    Después se acerca a 50 con K preguntas imaginarias (corrección por casillas vacías).
    Devuelve (usuarios × partidos)."""
    f = ACUERDO[metrica]
    azar = {p: float(np.mean(f(np.abs(ESCALA - p)))) for p in ESCALA}
    E = np.vectorize(lambda p: np.nan if np.isnan(p) else azar[int(p)])(P)[None, :, :]
    U = U[:, :, None]
    W = W[:, :, None]
    Pm = P[None, :, :]
    mask = ~np.isnan(U) & ~np.isnan(Pm)
    with np.errstate(invalid="ignore"):
        kappa = np.where(mask, (f(np.abs(U - Pm)) - E) / (1 - E), 0.0)
    w = np.where(mask, W, 0.0)
    n = mask.sum(axis=1)
    wsum = w.sum(axis=1)
    raw = np.where(wsum > 0, 50 + 50 * (w * kappa).sum(axis=1) / np.where(wsum > 0, wsum, 1), 50.0)
    return (n * raw + K_ENCOGIMIENTO * 50) / (n + K_ENCOGIMIENTO)


def pc(x, dec=0):
    """0.231 -> '23,1 %' (formato español)."""
    return f"{100 * x:.{dec}f}".replace(".", ",") + "\u00a0%"


def ganador(S, rng):
    # desempate al azar entre partidos con la misma puntuación
    return np.argmax(S + rng.random(S.shape) * 1e-9, axis=1)


# ---------------------------------------------------------------------------
# 3. Pruebas de neutralidad
# ---------------------------------------------------------------------------
def votantes_realistas(P, j, n, rng):
    base = np.tile(P[:, j], (n, 1))
    U = base.copy()
    mueve = rng.random(U.shape) < 0.40
    signo = rng.choice([-1, 1], size=U.shape)
    signo = np.where(U == 2, -1, np.where(U == -2, 1, signo))
    U = np.where(mueve & ~np.isnan(U), U + signo, U)
    U = np.where(rng.random(U.shape) < 0.10, np.nan, U)
    return U


def pruebas(P, nombres, rng):
    J, Q = P.shape[1], P.shape[0]
    res = []

    # Votante perfecto
    U = P.T.copy()
    W = np.ones_like(U)
    g = ganador(puntuar(U, W, P), rng)
    ok = bool((g == np.arange(J)).all())
    fallos = [nombres[j] for j in range(J) if g[j] != j]
    res.append({
        "prueba": "Coincidencia perfecta",
        "que": "Respuestas idénticas a las posturas de cada partido.",
        "criterio": "El partido correspondiente obtiene el primer puesto en todos los casos.",
        "resultado": "Se cumple para todos los partidos." if ok else "No se cumple para: " + ", ".join(fallos) + ".",
        "ok": ok,
    })

    # Votante realista
    N = 5000
    conf = np.zeros((J, J))
    for j in range(J):
        U = votantes_realistas(P, j, N, rng)
        g = ganador(puntuar(U, np.ones_like(U), P), rng)
        conf[j] = np.bincount(g, minlength=J) / N
    diag = np.diag(conf)
    ok = bool((diag >= 0.80).all())
    peor = int(np.argmin(diag))
    res.append({
        "prueba": "Votante realista",
        "que": f"{N:,}".replace(",", ".") + " usuarios por partido que parten de sus posturas, con un 40 % de respuestas desviadas un nivel y un 10 % de «no lo sé».",
        "criterio": "Al menos el 80 % obtiene como resultado el partido del que parte.",
        "resultado": "Porcentaje de acierto: " + ", ".join(f"{nombres[j]} {pc(diag[j])}" for j in range(J)) + ".",
        "ok": ok,
        "confusion": [[round(float(x), 4) for x in fila] for fila in conf],
    })

    # Votante al azar
    N = 100_000
    U = rng.integers(-2, 3, size=(N, Q)).astype(float)
    U[rng.random(U.shape) < 0.10] = np.nan
    g = ganador(puntuar(U, np.ones_like(U), P), rng)
    cuota = np.bincount(g, minlength=J) / N
    lo, hi = 0.5 / J, 1.5 / J
    ok = bool(((cuota >= lo) & (cuota <= hi)).all())
    res.append({
        "prueba": "Respuestas aleatorias",
        "que": "100.000 usuarios que responden al azar.",
        "criterio": f"Cada partido obtiene el primer puesto entre el {pc(lo)} y el {pc(hi)} de las veces (el reparto equitativo sería el {pc(1/J)}).",
        "resultado": "Frecuencia del primer puesto: " + ", ".join(f"{nombres[j]} {pc(cuota[j], 1)}" for j in range(J)) + ".",
        "ok": ok,
    })

    # Todo sí / todo no / todo neutral
    partes, ok = [], True
    for etiqueta, v in (("siempre «muy a favor»", 2), ("siempre «muy en contra»", -2), ("siempre «neutral»", 0)):
        S = puntuar(np.full((1, Q), float(v)), np.ones((1, Q)), P)[0]
        orden = np.argsort(-S)
        dif = S[orden[0]] - S[orden[1]]
        ok &= bool(dif < 5)
        partes.append(f"{etiqueta}: diferencia de " + f"{dif:.1f}".replace(".", ",") + " puntos")
    res.append({
        "prueba": "Respuesta uniforme",
        "que": "Usuarios que eligen la misma respuesta en todas las propuestas.",
        "criterio": "La diferencia entre el primer y el segundo partido es inferior a 5 puntos.",
        "resultado": "; ".join(partes) + ".",
        "ok": ok,
    })

    # Pregunta decisiva (jackknife)
    criticas = []
    for q in range(Q):
        Pq = np.delete(P, q, axis=0)
        U = Pq.T.copy()
        g = ganador(puntuar(U, np.ones_like(U), Pq), rng)
        if (g != np.arange(J)).any():
            criticas.append(q)
    ok = not criticas
    res.append({
        "prueba": "Influencia de una sola propuesta",
        "que": "Se elimina cada propuesta, de una en una, y se repite la prueba de coincidencia perfecta.",
        "criterio": "Ninguna propuesta altera por sí sola el resultado.",
        "resultado": "Ninguna propuesta altera por sí sola el resultado." if ok else f"{len(criticas)} propuestas alteran el resultado.",
        "ok": ok,
        "criticas": criticas,
    })

    # Otra fórmula
    iguales, total = 0, 0
    for j in range(J):
        U = votantes_realistas(P, j, 2000, rng)
        W = np.ones_like(U)
        r1 = rng.random((U.shape[0], J)) * 1e-9
        g1 = np.argmax(puntuar(U, W, P) + r1, axis=1)
        g2 = np.argmax(puntuar(U, W, P, "euclidea") + r1, axis=1)
        iguales += int((g1 == g2).sum())
        total += len(g1)
    acuerdo = iguales / total
    ok = acuerdo >= 0.95
    res.append({
        "prueba": "Robustez del método",
        "que": "Se repite el cálculo con distancia euclídea en lugar de distancia de Manhattan, sobre 10.000 votantes realistas.",
        "criterio": "El partido con mayor coincidencia es el mismo en al menos el 95 % de los casos.",
        "resultado": f"Coincide en el {pc(acuerdo, 1)} de los casos.",
        "ok": bool(ok),
    })
    return res


# ---------------------------------------------------------------------------
# 4. Salidas
# ---------------------------------------------------------------------------
def casos_prueba(P, Q, rng, n=60):
    """Respuestas aleatorias con sus puntuaciones para comparar con motor.js."""
    U = rng.integers(-2, 3, size=(n, Q)).astype(float)
    U[rng.random(U.shape) < 0.15] = np.nan
    W = np.where(rng.random(U.shape) < 0.2, 2.0, 1.0)
    S = puntuar(U, W, P)
    return [{
        "u": [None if np.isnan(x) else int(x) for x in U[i]],
        "w": [int(x) for x in W[i]],
        "esperado": [round(float(x), 6) for x in S[i]],
    } for i in range(n)]


def main():
    config, partidos, propuestas, referencias = leer_excel()
    if errores:
        print("\nHay errores en el Excel. Corrígelos y vuelve a ejecutar:\n")
        for e in errores:
            print("  ✗", e)
        sys.exit(1)

    ids = [p["id"] for p in partidos]
    nombres = [p["nombre"] for p in partidos]
    P = np.array([[np.nan if q["posturas"][pid]["v"] is None else q["posturas"][pid]["v"]
                   for pid in ids] for q in propuestas], dtype=float)
    rng = np.random.default_rng(SEMILLA)

    print(f"Excel correcto: {len(partidos)} partidos, {len(propuestas)} propuestas.")
    print("Ejecutando las pruebas de neutralidad…")
    res = pruebas(P, nombres, rng)
    fecha = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    datos = {
        "config": config,
        "partidos": partidos,
        "propuestas": propuestas,
        "referencias": referencias,
        "validacion": {"fecha": fecha, "semilla": SEMILLA, "pruebas": res},
        "parametros": {"k": K_ENCOGIMIENTO, "bootstrap": 1000, "umbral_empate": 0.70},
    }
    contenido = ("// Generado por scripts/construir.py — no editar a mano. Edita datos/datos.xlsx.\n"
                 "window.BRUJULA_DATA = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
    CANDIDATO.write_text(contenido, encoding="utf-8")
    CASOS.write_text(json.dumps({"partidos": ids, "casos": casos_prueba(P, len(propuestas), rng)}), encoding="utf-8")

    print()
    for r in res:
        print(f"  {'✓' if r['ok'] else '✗'} {r['prueba']}: {r['resultado']}")
    if avisos:
        print("\nAvisos:")
        for a in avisos:
            print("  !", a)

    motor_ok = True
    if shutil.which("node"):
        out = subprocess.run(["node", str(RAIZ / "scripts" / "comprobar_motor.js"), str(CANDIDATO)],
                             capture_output=True, text=True)
        print("\n" + (out.stdout or out.stderr).strip())
        motor_ok = out.returncode == 0
    else:
        print("\n(Node.js no está instalado: me salto la comprobación web = script.)")

    fallidas = [r["prueba"] for r in res if not r["ok"]]
    publicable = not fallidas and motor_ok

    lineas = [f"# Informe de validación — {config['titulo']}", "",
              f"Generado: {fecha} · semilla {SEMILLA}", "",
              f"**Estado: {'PUBLICABLE' if publicable else 'NO PUBLICABLE'}**", "",
              "| Prueba | Criterio | Resultado | ¿Aprobada? |", "| --- | --- | --- | --- |"]
    for r in res:
        lineas.append(f"| {r['prueba']} | {r['criterio']} | {r['resultado']} | {'Sí' if r['ok'] else 'NO'} |")
    if avisos:
        lineas += ["", "## Avisos sobre los datos", ""] + [f"- {a}" for a in avisos]
    INFORME.write_text("\n".join(lineas) + "\n", encoding="utf-8")

    if publicable:
        shutil.copyfile(CANDIDATO, SALIDA_JS)
        CANDIDATO.unlink()
        print("\nPUBLICABLE: todas las pruebas superadas. data.js y validacion.md actualizados.")
        print("Sube a GitHub: datos/datos.xlsx, data.js y validacion.md.")
    else:
        motivo = ("no han pasado estas pruebas: " + ", ".join(fallidas)) if fallidas else "la web y el script no calculan igual"
        print(f"\nNO PUBLICABLE: {motivo}.")
        print("data.js NO se ha modificado: la web sigue mostrando los últimos datos válidos.")
        print("Cambia la selección de propuestas (no la fórmula) y vuelve a ejecutar. Detalle en validacion.md.")
        sys.exit(2)


if __name__ == "__main__":
    main()
