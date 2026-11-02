// Comprueba que motor.js (la web) calcula exactamente igual que construir.py.
// Lo ejecuta construir.py automáticamente si Node.js está instalado.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[2] || path.join(raiz, "data.js"), "utf8"), ctx);
const datos = ctx.window.BRUJULA_DATA;
const Motor = require(path.join(raiz, "motor.js"));
const { partidos, casos } = JSON.parse(fs.readFileSync(path.join(__dirname, "casos_prueba.json"), "utf8"));

let maxDif = 0;
for (const caso of casos) {
  const resp = {};
  datos.propuestas.forEach((q, i) => { resp[q.id] = { v: caso.u[i], imp: caso.w[i] === 2 }; });
  const res = Motor.puntuar(datos, resp);
  res.forEach((r, j) => {
    if (r.id !== partidos[j]) throw new Error("Orden de partidos distinto");
    maxDif = Math.max(maxDif, Math.abs(r.ajustado - caso.esperado[j]));
  });
}
if (maxDif > 1e-6) {
  console.error(`✗ La web y el script NO calculan igual (diferencia máxima ${maxDif}).`);
  process.exit(1);
}
console.log(`✓ La web calcula igual que el script en ${casos.length} casos de prueba (diferencia máxima ${maxDif.toExponential(1)}).`);
