# Brújula 29N

Test de orientación de voto para las elecciones generales del 29 de noviembre de 2026. El usuario valora propuestas literales de los programas sin saber de qué partido son, y al final ve con quién coincide más y, pregunta a pregunta, qué opina cada partido.

La web es estática: no hay servidor ni base de datos y no guarda ninguna respuesta. Todo el cálculo ocurre en el navegador de quien hace el test.

## Qué hay en cada archivo

| Archivo | Qué es | ¿Se edita a mano? |
| --- | --- | --- |
| `datos/datos.xlsx` | Partidos, propuestas, posturas y citas | **Sí: es lo único que se edita** |
| `scripts/construir.py` | Comprueba el Excel, hace las simulaciones y genera `data.js` | No |
| `data.js` | Los datos que lee la web (generado) | No |
| `validacion.md` | Informe de las pruebas de neutralidad (generado) | No |
| `index.html`, `app.js`, `motor.js`, `styles.css` | La web | Solo si quieres cambiar el diseño |
| `scripts/comprobar_motor.js` | Comprueba que la web calcula igual que el script | No |

## Ver la web en tu ordenador

Haz doble clic en `index.html`. Se abre en el navegador y funciona sin instalar nada.

## Publicarla en GitHub Pages (una sola vez)

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo, público, por ejemplo `brujula29n`.
3. En el repositorio, pulsa **Add file → Upload files** y arrastra todo el contenido de esta carpeta (no la carpeta en sí). Pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
5. En uno o dos minutos la web estará en `https://TU-USUARIO.github.io/brujula29n/`.

Si prefieres usar git desde la terminal: `git init`, `git add .`, `git commit`, y `git push` al repositorio que creaste.

## Pasar de la demo a los datos reales

Cuando salgan los programas:

1. Abre `datos/datos.xlsx`:
   - Hoja **config**: cambia `demo` a `no`, pon tu nombre en `autoria` y escribe la nota sobre partidos y coaliciones territoriales en `nota_partidos`.
   - Hoja **partidos**: sustituye los ficticios por los reales (ids cortos sin espacios: `PP`, `PSOE`, `VOX`, `FA`, `POD`).
   - Hoja **propuestas**: renombra las columnas de postura y cita con los nuevos ids (`PP postura`, `PP cita`…) y rellena las filas. La hoja **instrucciones** explica cada columna.
2. La primera vez, instala lo necesario: `pip install -r scripts/requirements.txt`
3. Ejecuta, desde esta carpeta: `python scripts/construir.py`
   - Si hay errores en el Excel (postura sin cita, autor sin postura 2, valores fuera de −2…2…), te dice la fila exacta y no genera nada.
   - Si alguna prueba de neutralidad no pasa, lo avisa. La web lo muestra tal cual en *Cómo funciona*: corrige la selección de propuestas, no la fórmula.
4. Abre `index.html` para comprobarlo y sube a GitHub los archivos que han cambiado: `datos/datos.xlsx`, `data.js` y `validacion.md` (con **Add file → Upload files**, que los reemplaza).

## Cómo calcula

Para cada partido y cada pregunta respondida:

```
acuerdo        = 1 − |respuesta − postura| / 4
κ              = (acuerdo − acuerdo al azar) / (1 − acuerdo al azar)
coincidencia   = 50 + 50 × media ponderada de κ      (peso 2 si «me importa mucho»)
final          = (n × coincidencia + 3 × 50) / (n + 3)
```

100 % = pensar exactamente igual; 50 % = lo que se coincide respondiendo al azar. La corrección por azar evita que salgan favorecidos los partidos con posturas más tibias, y la última línea frena a los partidos que se pronuncian sobre pocas propuestas. El empate técnico se decide con 1.000 repeticiones *bootstrap*: si el primero no queda primero en al menos el 70 %, se avisa.
