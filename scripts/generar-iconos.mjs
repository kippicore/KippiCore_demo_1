// Genera los íconos de la PWA, el favicon y la imagen Open Graph (PLAN 5.11, 2.2.3) desde SVG PROPIOS:
// el wordmark HALDEN en Figtree Black (OFL) convertido a trazados (scripts/contornos-wordmark.json, ver
// scripts/contornos-wordmark.py), blanco sobre #0A0A0A. Sin logotipos ni fotos de terceros.
// Uso: node scripts/generar-iconos.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(readFileSync(join(raiz, 'scripts', 'contornos-wordmark.json'), 'utf8'));
const NEGRO = '#0A0A0A';
const BLANCO = '#FFFFFF';
const GRIS = '#A3A3A3';

/** Texto en trazados, centrado en (cx, y-línea-base) con ancho dado. */
function texto(clave, cx, base, ancho, color) {
  const t = T[clave];
  const k = ancho / t.ancho;
  return `<path transform="translate(${(cx - ancho / 2).toFixed(2)} ${base.toFixed(2)}) scale(${k.toFixed(5)})" d="${t.d}" fill="${color}"/>`;
}
/** Alto de mayúscula del texto al ancho dado. */
const altoMayus = (clave, ancho) => (T[clave].capHeight * ancho) / T[clave].ancho;

function icono(lado, fraccion) {
  const ancho = lado * fraccion;
  const h = altoMayus('HALDEN', ancho);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" fill="${NEGRO}"/>${texto('HALDEN', lado / 2, lado / 2 + h / 2, ancho, BLANCO)}</svg>`;
}

function favicon() {
  const lado = 64;
  const ancho = 30;
  const h = altoMayus('H', ancho);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" fill="${NEGRO}"/>${texto('H', lado / 2, lado / 2 + h / 2, ancho, BLANCO)}</svg>`;
}

function og() {
  const W = 1200;
  const H = 630;
  const anchoMarca = 620;
  const hMarca = altoMayus('HALDEN', anchoMarca);
  const base = H / 2 + hMarca / 2 - 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${NEGRO}"/>
${texto('KIPPICORE CRM · DEMO CON DATOS DE EJEMPLO', W / 2, 92, 520, GRIS)}
${texto('HALDEN', W / 2, base, anchoMarca, BLANCO)}
${texto('MODA MASCULINA · BOGOTÁ', W / 2, base + 64, 330, GRIS)}
<rect x="${W / 2 - 24}" y="${base + 118}" width="48" height="2" fill="#A67C52"/>
${texto('ASÍ SE VERÍA TU NEGOCIO', W / 2, base + 196, 560, BLANCO)}
${texto('EN UN SOLO LUGAR', W / 2, base + 246, 420, BLANCO)}
</svg>`;
}

mkdirSync(join(raiz, 'public', 'iconos'), { recursive: true });
mkdirSync(join(raiz, 'public', 'og'), { recursive: true });
const fuente = icono(512, 0.62);
writeFileSync(join(raiz, 'public', 'iconos', 'fuente.svg'), fuente);
writeFileSync(join(raiz, 'public', 'favicon.svg'), favicon());
writeFileSync(join(raiz, 'public', 'og', 'fuente.svg'), og());

const png = (svg, archivo, lado) => sharp(Buffer.from(svg), { density: 144 }).resize(lado, lado).png({ compressionLevel: 9 }).toFile(join(raiz, 'public', archivo));
await png(icono(512, 0.62), 'iconos/pwa-512.png', 512);
await png(icono(192, 0.62), 'iconos/pwa-192.png', 192);
// Maskable: el wordmark dentro de la zona segura (círculo del 80 %): 52 % del lado.
await png(icono(512, 0.52), 'iconos/maskable-512.png', 512);
await png(icono(180, 0.6), 'iconos/apple-touch-icon-180.png', 180);
await png(favicon(), 'iconos/favicon-48.png', 48);
await sharp(Buffer.from(og()), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toFile(join(raiz, 'public', 'og', 'halden-og.png'));
console.log('Íconos e imagen Open Graph generados.');
