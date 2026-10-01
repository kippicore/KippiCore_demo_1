import type { ReactNode } from 'react';
import type { TipoPrenda } from '@/dominio/tipos';
import type { ColoresPrenda } from './colores';
import { TINTAS_PRENDA } from './colores';

/**
 * Dibujos técnicos de moda (PLAN 8.8.4): frente, simétricos respecto a x = 150, en el lienzo 300 × 400, dentro de la
 * zona segura (x 48–252, y 48–376). Capas: silueta (F + trazo S) → patrón → volumen (banda lateral al 6 %) →
 * costuras (0,9, opacidad .65) → pespuntes (0,75, punteado 2 2.5) → botones. Sin sombras, sin degradados, sin caras.
 */
export interface Contexto {
  c: ColoresPrenda;
  /** Trazo base de la silueta (miniatura 1 · tarjeta 1,25 · hero 1,5). */
  t: number;
  /** id del <pattern> del patrón de la variante (null = liso). */
  patron: string | null;
  /** id del <pattern> de punto (puños y bajo del suéter). */
  punto: string;
  /** Corrección de proporciones (ver PROPORCION): transforma un trazado y un punto. */
  d: (trazado: string) => string;
  m: (x: number, y: number) => readonly [number, number];
}

/**
 * Proporción de las prendas superiores. Las coordenadas de 8.8.4 dan cuerpos muy angostos para su largo (una camisa
 * se leía como túnica); se ensanchan en x y se acortan en y alrededor del centro del lienzo, sin tocar los trazos
 * (`non-scaling-stroke`) ni la forma de los botones. Registrado en DECISIONES (F2-C).
 */
export const PROPORCION: Partial<Record<TipoPrenda, { sx: number; sy: number }>> = {
  camisa: { sx: 1.17, sy: 0.92 },
  polo: { sx: 1.17, sy: 0.92 },
  sweater: { sx: 1.17, sy: 0.92 },
  blazer: { sx: 1.15, sy: 0.94 },
  chaleco: { sx: 1.2, sy: 0.94 },
  abrigo: { sx: 1.1, sy: 0.96 },
  chaqueta: { sx: 1.14, sy: 0.94 },
};

const CENTRO = { x: 150, y: 212 } as const;

/** Funciones de transformación para un tipo (identidad si no tiene corrección). */
export function transformador(tipo: TipoPrenda): Pick<Contexto, 'd' | 'm'> {
  const p = PROPORCION[tipo];
  if (!p) return { d: (t) => t, m: (x, y) => [x, y] as const };
  const m = (x: number, y: number) => [Math.round((CENTRO.x + (x - CENTRO.x) * p.sx) * 100) / 100, Math.round((CENTRO.y + (y - CENTRO.y) * p.sy) * 100) / 100] as const;
  // Trazados con comandos absolutos M, L, Q y Z: los números van por pares (x y).
  const d = (t: string) =>
    t.replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, a: string, b: string) => {
      const [x, y] = m(Number(a), Number(b));
      return `${x} ${y}`;
    });
  return { d, m };
}

const espejo = (x: number) => 300 - x;

/** Pieza de tela: relleno, patrón encima y contorno. */
function Tela({ d: d0, k, fill, sinPatron }: { d: string; k: Contexto; fill?: string; sinPatron?: boolean }) {
  const d = k.d(d0);
  return (
    <>
      <path d={d} fill={fill ?? k.c.F} />
      {k.patron && !sinPatron && <path d={d} fill={`url(#${k.patron})`} />}
      <path d={d} fill="none" stroke={k.c.S} strokeWidth={k.t} />
    </>
  );
}

function Volumen({ d, k }: { d: string; k: Contexto }) {
  return <path d={k.d(d)} fill={k.c.volumen} fillOpacity={0.045} />;
}

function Costura({ d, k, opacidad = 0.65 }: { d: string; k: Contexto; opacidad?: number }) {
  return <path d={k.d(d)} fill="none" stroke={k.c.S} strokeWidth={0.9} strokeOpacity={opacidad} />;
}

function Pespunte({ d, k }: { d: string; k: Contexto }) {
  return <path d={k.d(d)} fill="none" stroke={k.c.S} strokeWidth={0.75} strokeDasharray="2 2.5" strokeOpacity={0.65} />;
}

function Boton({ x, y, r = 2.2, k }: { x: number; y: number; r?: number; k: Contexto }) {
  const [cx, cy] = k.m(x, y);
  return <circle cx={cx} cy={cy} r={r} fill={k.c.B} stroke={k.c.S} strokeWidth={0.75} />;
}

function Botones({ ys, x = 150, r, k }: { ys: number[]; x?: number; r?: number; k: Contexto }) {
  return (
    <>
      {ys.map((y) => (
        <Boton key={y} x={x} y={y} r={r} k={k} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Camisa (referencia completa de 8.8.4)
// ---------------------------------------------------------------------------------------------------------
function camisa(k: Contexto): ReactNode {
  return (
    <>
      <Tela
        k={k}
        d="M128 80 L88 96 L56 232 L54 262 L78 266 L82 238 L98 150 L100 336 Q124 354 150 350 Q176 354 200 336 L202 150 L218 238 L222 266 L246 262 L244 232 L212 96 L172 80 Z"
      />
      <Volumen k={k} d="M98 150 L100 336 Q107 341 114 344 L113 150 Z" />
      {/* costuras de sisa y canesú */}
      <Costura k={k} opacidad={0.35} d="M88 96 Q96 124 98 150 M212 96 Q204 124 202 150" />
      <Costura k={k} opacidad={0.35} d="M100 112 Q150 104 200 112" />
      {/* puños con su botón */}
      <Costura k={k} d="M56 236 L81 240 M219 240 L244 236" />
      <Boton k={k} x={68} y={251} r={1.6} />
      <Boton k={k} x={232} y={251} r={1.6} />
      {/* tapeta */}
      <Costura k={k} d="M144 98 L144 349 M156 98 L156 349" />
      {/* pie de cuello (interior) y hojas del cuello de punta */}
      <path d={k.d("M128 80 L131 68 Q150 62 169 68 L172 80 Q150 74 128 80 Z")} fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      <path d={k.d("M133 71 Q150 66 167 71 L166 75 Q150 70 134 75 Z")} fill={k.c.forro} fillOpacity={0.35} />
      <Tela k={k} d="M150 90 Q140 78 131 68 L121 84 L133 109 Q142 98 150 90 Z" />
      <Tela k={k} d="M150 90 Q160 78 169 68 L179 84 L167 109 Q158 98 150 90 Z" />
      <Pespunte k={k} d="M146 92 Q139 99 134.5 104.5 L125 84.5 L131.5 74 M154 92 Q161 99 165.5 104.5 L175 84.5 L168.5 74" />
      {/* bolsillo de pecho (lado izquierdo de quien la viste) */}
      <Costura k={k} d="M164 128 L188 128 L188 152 L176 156 L164 152 Z" />
      <Pespunte k={k} d="M164 132 L188 132" />
      <Botones k={k} ys={[112, 146, 180, 214, 248, 282, 316]} />
      {/* pespunte del faldón */}
      <Pespunte k={k} d="M100 330 Q124 348 150 344 Q176 348 200 330" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Polo
// ---------------------------------------------------------------------------------------------------------
function polo(k: Contexto): ReactNode {
  return (
    <>
      <Tela k={k} d="M130 80 L90 94 L62 168 L86 180 L100 146 L100 338 Q150 346 200 338 L200 146 L214 180 L238 168 L210 94 L170 80 Z" />
      <Volumen k={k} d="M100 146 L100 338 Q107 339.5 114 340.5 L114 146 Z" />
      <Costura k={k} opacidad={0.35} d="M90 94 Q98 120 100 146 M210 94 Q202 120 200 146" />
      {/* puño de punto */}
      <path d={k.d("M62 168 L86 180 L89 172 L66 160 Z")} fill={`url(#${k.punto})`} />
      <path d={k.d(`M${espejo(62)} 168 L${espejo(86)} 180 L${espejo(89)} 172 L${espejo(66)} 160 Z`)} fill={`url(#${k.punto})`} />
      <Costura k={k} d="M66 160 L89 171 M234 160 L211 171" />
      {/* bajo y aberturas laterales */}
      <Pespunte k={k} d="M100 330 Q150 338 200 330" />
      <Costura k={k} d="M100 326 L106 326 M200 326 L194 326" opacidad={0.4} />
      {/* tapeta corta con 3 botones */}
      <Tela k={k} d="M144 96 L156 96 L156 156 L144 156 Z" />
      <Botones k={k} ys={[112, 128, 144]} r={2} />
      {/* cuello de punto */}
      <path d={k.d("M130 80 L133 70 Q150 64 167 70 L170 80 Q150 75 130 80 Z")} fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      <Tela k={k} d="M150 96 Q141 83 133 70 L124 84 L135 106 Q143 102 150 96 Z" />
      <Tela k={k} d="M150 96 Q159 83 167 70 L176 84 L165 106 Q157 102 150 96 Z" />
      <Costura k={k} opacidad={0.4} d="M126.5 86 L136 103 M173.5 86 L164 103" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Suéter
// ---------------------------------------------------------------------------------------------------------
function sweater(k: Contexto): ReactNode {
  return (
    <>
      <Tela
        k={k}
        d="M126 82 L90 96 L58 236 Q56 252 60 262 L82 266 Q84 254 84 244 L100 152 Q96 250 102 334 L198 334 Q204 250 200 152 L216 244 Q216 254 218 266 L240 262 Q244 252 242 236 L210 96 L174 82 Q150 98 126 82 Z"
      />
      <Volumen k={k} d="M100 152 Q96 250 102 334 L116 334 Q112 250 114 152 Z" />
      <Costura k={k} opacidad={0.35} d="M90 96 Q98 124 100 152 M210 96 Q202 124 200 152" />
      {/* interior del escote (espalda) */}
      <path d={k.d("M126 82 Q150 72 174 82 Q150 96 126 82 Z")} fill={k.c.forro} stroke={k.c.S} strokeWidth={k.t} />
      {/* rib del escote */}
      <path d={k.d("M126 82 Q150 98 174 82 L178 87 Q150 106 122 87 Z")} fill={k.c.F} />
      <path d={k.d("M126 82 Q150 98 174 82 L178 87 Q150 106 122 87 Z")} fill={`url(#${k.punto})`} />
      <path d={k.d("M126 82 Q150 98 174 82 L178 87 Q150 106 122 87 Z")} fill="none" stroke={k.c.S} strokeWidth={k.t} />
      {/* puños y bajo de punto */}
      {['M57 246 Q56 255 60 262 L82 266 Q84 258 84 250 Z', `M${espejo(57)} 246 Q${espejo(56)} 255 ${espejo(60)} 262 L${espejo(82)} 266 Q${espejo(84)} 258 ${espejo(84)} 250 Z`, 'M101 318 L199 318 L198 334 L102 334 Z'].map((d) => (
        <g key={d}>
          <path d={k.d(d)} fill={`url(#${k.punto})`} />
          <Costura k={k} d={d} />
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Blazer
// ---------------------------------------------------------------------------------------------------------
const SILUETA_BLAZER =
  'M132 74 L84 90 Q78 96 76 108 L56 296 L80 302 L96 170 L98 344 Q118 350 136 346 L150 264 L164 346 Q182 350 202 344 L204 170 L220 302 L244 296 L224 108 Q222 96 216 90 L168 74 Z';

function blazer(k: Contexto): ReactNode {
  const solapaI = 'M150 206 L106 126 L116 114 L124 120 L138 76 Z';
  const solapaD = `M150 206 L${espejo(106)} 126 L${espejo(116)} 114 L${espejo(124)} 120 L${espejo(138)} 76 Z`;
  return (
    <>
      <Tela k={k} d={SILUETA_BLAZER} />
      <Volumen k={k} d="M96 170 L98 344 Q105 346 112 347 L111 170 Z" />
      {/* sisas y hombrera */}
      <Costura k={k} opacidad={0.35} d="M84 90 Q94 128 96 170 M216 90 Q206 128 204 170" />
      {/* escote en V (forro / camisa) y cuello */}
      <path d={k.d("M138 76 L150 206 L162 76 Q150 70 138 76 Z")} fill={k.c.forro} stroke={k.c.S} strokeWidth={k.t} />
      <path d={k.d("M132 74 Q150 66 168 74 L162 77 Q150 72 138 77 Z")} fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      <Tela k={k} d={solapaI} />
      <Tela k={k} d={solapaD} />
      <Pespunte k={k} d="M146 196 L110 127 L117 118.5 M154 196 L190 127 L183 118.5" />
      {/* borde delantero bajo el quiebre */}
      <Costura k={k} d="M150 206 L150 264" />
      <Botones k={k} ys={[222, 256]} r={3} />
      {/* bolsillos con tapa y de pecho */}
      <Tela k={k} d="M100 268 L136 266 L136 278 L100 280 Z" />
      <Tela k={k} d={`M${espejo(100)} 268 L${espejo(136)} 266 L${espejo(136)} 278 L${espejo(100)} 280 Z`} />
      <Tela k={k} d="M168 150 L192 146 L192 151 L168 155 Z" />
      {/* pinzas */}
      <Costura k={k} opacidad={0.4} d="M118 160 L120 262 M182 160 L180 262" />
      {/* botones de puño */}
      {[276, 283, 290].map((y, i) => (
        <g key={y}>
          <Boton k={k} x={66 - i * 0.6} y={y} r={1.6} />
          <Boton k={k} x={espejo(66 - i * 0.6)} y={y} r={1.6} />
        </g>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Chaleco
// ---------------------------------------------------------------------------------------------------------
function chaleco(k: Contexto): ReactNode {
  return (
    <>
      <Tela k={k} d="M132 74 L100 88 Q104 122 98 150 L104 324 L136 344 L150 334 L164 344 L196 324 L202 150 Q196 122 200 88 L168 74 Z" />
      <Volumen k={k} d="M98 150 L104 324 L114 330 L111 150 Z" />
      {/* escote en V profundo y espalda */}
      <path d={k.d("M138 76 L150 226 L162 76 Q150 70 138 76 Z")} fill={k.c.forro} stroke={k.c.S} strokeWidth={k.t} />
      <Pespunte k={k} d="M141 80 L150 214 L159 80" />
      <Costura k={k} d="M150 226 L150 334" />
      <Botones k={k} ys={[240, 262, 284, 306]} r={2.6} />
      {/* bolsillos de vivo y pinzas */}
      <Costura k={k} d="M112 262 L134 262 M112 265 L134 265 M188 262 L166 262 M188 265 L166 265" />
      <Costura k={k} d="M114 166 L132 164 M186 166 L168 164" opacidad={0.5} />
      <Costura k={k} opacidad={0.4} d="M122 170 L124 300 M178 170 L176 300" />
      {/* contorno de sisa */}
      <Pespunte k={k} d="M104 92 Q108 124 102 148 M196 92 Q192 124 198 148" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Abrigo
// ---------------------------------------------------------------------------------------------------------
const SILUETA_ABRIGO =
  'M132 72 L82 88 Q76 94 74 108 L52 312 L78 318 L96 170 L96 372 L204 372 L204 170 L222 318 L248 312 L226 108 Q224 94 218 88 L168 72 Z';

function abrigo(k: Contexto): ReactNode {
  const solapaI = 'M150 196 L100 130 L112 116 L120 124 L138 74 Z';
  const solapaD = `M150 196 L${espejo(100)} 130 L${espejo(112)} 116 L${espejo(120)} 124 L${espejo(138)} 74 Z`;
  return (
    <>
      <Tela k={k} d={SILUETA_ABRIGO} />
      <Volumen k={k} d="M96 170 L96 372 L112 372 L111 170 Z" />
      <Costura k={k} opacidad={0.35} d="M82 88 Q94 128 96 170 M218 88 Q206 128 204 170" />
      <path d={k.d("M138 74 L150 196 L162 74 Q150 68 138 74 Z")} fill={k.c.forro} stroke={k.c.S} strokeWidth={k.t} />
      <path d={k.d("M132 72 Q150 64 168 72 L162 75 Q150 70 138 75 Z")} fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      <Tela k={k} d={solapaI} />
      <Tela k={k} d={solapaD} />
      <Pespunte k={k} d="M146 186 L104 131 L112.5 120.5 M154 186 L196 131 L187.5 120.5" />
      <Costura k={k} d="M150 196 L150 372" />
      <Botones k={k} ys={[210, 250, 290]} r={3.2} />
      <Costura k={k} d="M102 282 L124 300 M198 282 L176 300" />
      <Pespunte k={k} d="M98 362 L202 362" />
      {/* martingala de puño */}
      <Costura k={k} opacidad={0.5} d="M57 290 L77 296 M243 290 L223 296" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Chaqueta (cremallera, cuello alto)
// ---------------------------------------------------------------------------------------------------------
function chaqueta(k: Contexto): ReactNode {
  return (
    <>
      <Tela k={k} d="M130 78 L82 90 Q76 96 74 110 L54 304 L80 310 L96 172 L96 330 L204 330 L204 172 L220 310 L246 304 L226 110 Q224 96 218 90 L170 78 Z" />
      <Volumen k={k} d="M96 172 L96 330 L112 330 L111 172 Z" />
      <Costura k={k} opacidad={0.35} d="M82 90 Q94 130 96 172 M218 90 Q206 130 204 172" />
      {/* puños y bajo de punto */}
      {['M55 292 L80 298 L80 310 L54 304 Z', `M${espejo(55)} 292 L${espejo(80)} 298 L${espejo(80)} 310 L${espejo(54)} 304 Z`, 'M96 316 L204 316 L204 330 L96 330 Z'].map((d) => (
        <g key={d}>
          <path d={k.d(d)} fill={`url(#${k.punto})`} />
          <Costura k={k} d={d} />
        </g>
      ))}
      {/* cuello alto */}
      <Tela k={k} d="M130 64 L170 64 L172 84 L128 84 Z" />
      <path d={k.d("M130 64 L170 64 L168 70 L132 70 Z")} fill={k.c.forro} fillOpacity={0.5} />
      {/* cremallera con pespunte a cada lado y tirador */}
      <Costura k={k} d="M150 84 L150 330" />
      <Pespunte k={k} d="M147 86 L147 316 M153 86 L153 316" />
      <rect x={k.m(146, 88)[0]} y={k.m(146, 88)[1]} width={8} height={11} fill={TINTAS_PRENDA.metal} stroke={k.c.S} strokeWidth={0.75} />
      {/* bolsillos de vivo verticales */}
      <Costura k={k} d="M118 236 L122 290 M182 236 L178 290" />
      {/* canesú */}
      <Costura k={k} opacidad={0.4} d="M96 132 Q150 124 204 132" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Pantalón
// ---------------------------------------------------------------------------------------------------------
function pantalon(k: Contexto): ReactNode {
  return (
    <>
      <Tela k={k} d="M104 52 L196 52 L198 66 L206 370 L160 370 L152 156 Q150 150 148 156 L140 370 L94 370 L102 66 Z" />
      <Volumen k={k} d="M102 66 L94 370 L108 370 L116 66 Z" />
      <Costura k={k} d="M102 66 L198 66" />
      {[112, 132, 164, 184].map((x) => (
        <rect key={x} x={x} y={50} width={4} height={20} fill={k.c.F} stroke={k.c.S} strokeWidth={0.9} />
      ))}
      <Boton k={k} x={150} y={59} r={2} />
      <Pespunte k={k} d="M156 66 L156 128 Q156 140 150 146" />
      <Costura k={k} d="M108 66 L122 104 M192 66 L178 104" />
      <Costura k={k} opacidad={0.35} d="M122 104 L118 370 M178 104 L182 370" />
      <Pespunte k={k} d="M95 362 L139 362 M161 362 L205 362" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Traje = pantalón + blazer
// ---------------------------------------------------------------------------------------------------------
function traje(k: Contexto): ReactNode {
  return (
    <>
      <g transform="translate(60 138) scale(0.6)">{pantalon(k)}</g>
      <g transform="translate(30 4) scale(0.8)">{blazer({ ...k, ...transformador('blazer') })}</g>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Zapato (perfil lateral, punta a la derecha)
// ---------------------------------------------------------------------------------------------------------
function zapato(k: Contexto): ReactNode {
  // Oxford de puntera recta, perfil lateral con la punta a la derecha.
  return (
    <g transform="translate(150 228) scale(1.24) translate(-150 -228)">
      <Tela k={k} d="M62 252 Q57 228 65 206 Q69 197 80 197 L110 201 Q118 194 128 191 Q140 194 150 201 Q196 213 228 225 Q250 233 253 245 Q254 252 246 252 Z" />
      {/* boca del zapato (forro visible) */}
      <path d={k.d("M70 199 Q90 196 110 201 Q92 205 72 205 Z")} fill={k.c.forro} stroke={k.c.S} strokeWidth={0.75} strokeOpacity={0.65} />
      {/* suela y tacón */}
      <path d={k.d("M58 252 L248 252 Q256 252 256 258 L256 261 L102 261 L102 268 L62 268 Q57 268 57 263 Z")} fill={k.c.suela} stroke={k.c.S} strokeWidth={k.t} />
      <Pespunte k={k} d="M104 256 L250 256" />
      {/* cuarto sobre la pala, ojales y cordones */}
      <Costura k={k} d="M116 198 Q132 222 122 251" />
      {[
        [122, 196],
        [130, 199],
        [138, 202],
        [146, 205],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={1.3} fill={k.c.forro} stroke={k.c.S} strokeWidth={0.6} />
      ))}
      <Costura k={k} d="M122 196 L138 202 M130 199 L146 205 M122 196 L130 199" />
      {/* puntera recta y contrafuerte */}
      <Costura k={k} d="M212 220 Q204 236 214 251" />
      <Pespunte k={k} d="M208 219 Q200 236 210 251" />
      <Costura k={k} d="M64 214 Q84 220 94 251" />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Cinturón enrollado
// ---------------------------------------------------------------------------------------------------------
function cinturon(k: Contexto): ReactNode {
  return (
    <>
      <path d={k.d("M54 214 A96 64 0 1 0 246 214 A96 64 0 1 0 54 214 Z M66 214 A84 52 0 1 1 234 214 A84 52 0 1 1 66 214 Z")} fillRule="evenodd" fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      <path d={k.d("M58 214 A92 60 0 1 0 242 214 A92 60 0 1 0 58 214 Z")} fill="none" stroke={k.c.S} strokeWidth={0.75} strokeDasharray="2 2.5" strokeOpacity={0.65} />
      {/* punta de la correa saliendo de la hebilla */}
      <path d={k.d("M134 268 L96 268 Q86 274 96 280 L134 280 Z")} fill={k.c.F} stroke={k.c.S} strokeWidth={k.t} />
      {[104, 114, 124].map((x) => (
        <circle key={x} cx={x} cy={274} r={1.6} fill={k.c.forro} />
      ))}
      {/* hebilla de metal */}
      <rect x={134} y={258} width={32} height={28} rx={2} fill="none" stroke={TINTAS_PRENDA.metal} strokeWidth={2.5} />
      <path d={k.d("M134 272 L158 272")} stroke={TINTAS_PRENDA.metal} strokeWidth={2} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Corbata
// ---------------------------------------------------------------------------------------------------------
function corbata(k: Contexto): ReactNode {
  return (
    <>
      <Tela k={k} d="M143 100 L126 300 L150 328 L174 300 L157 100 Z" />
      <Volumen k={k} d="M143 100 L126 300 L138 314 L148 100 Z" />
      <Tela k={k} d="M138 72 L162 72 L157 100 L143 100 Z" />
      <Costura k={k} d="M143 100 Q150 108 157 100" />
      <Costura k={k} opacidad={0.4} d="M150 108 L150 320" />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Billetera cerrada
// ---------------------------------------------------------------------------------------------------------
function billetera(k: Contexto): ReactNode {
  return (
    <g transform="translate(150 202) scale(1.25) translate(-150 -202)">
      <Tela k={k} d="M84 150 L216 150 Q222 150 222 156 L222 248 Q222 254 216 254 L84 254 Q78 254 78 248 L78 156 Q78 150 84 150 Z" />
      <Volumen k={k} d="M86 150 L86 254 L92 254 L92 150 Z" />
      <Pespunte k={k} d="M88 156 L212 156 Q216 156 216 160 L216 244 Q216 248 212 248 L88 248 Q84 248 84 244 L84 160 Q84 156 88 156 Z" />
      <Costura k={k} opacidad={0.5} d="M78 186 L222 186" />
      <Costura k={k} d="M86 150 L86 254" />
    </g>
  );
}

export const DIBUJOS: Record<TipoPrenda, (k: Contexto) => ReactNode> = {
  camisa,
  polo,
  sweater,
  blazer,
  chaleco,
  abrigo,
  chaqueta,
  traje,
  pantalon,
  zapato,
  cinturon,
  corbata,
  billetera,
};

/** viewBox de la vista "detalle" por tipo (8.8.5), recortes 3:4. */
export const VISTA_DETALLE: Record<TipoPrenda, string> = {
  camisa: '96 40 108 144',
  polo: '102 50 96 128',
  sweater: '96 56 108 144',
  blazer: '90 60 120 160',
  chaleco: '102 150 96 128',
  abrigo: '84 60 132 176',
  chaqueta: '90 56 120 160',
  traje: '90 40 120 160',
  pantalon: '96 40 108 144',
  zapato: '130 170 105 140',
  cinturon: '110 230 84 112',
  corbata: '120 60 60 80',
  billetera: '78 150 108 144',
};

/** Material por tipo para la vista "tejido" (8.8.5). */
export type MaterialPrenda = 'algodon' | 'lana' | 'punto' | 'cuero';
export const MATERIAL_POR_TIPO: Record<TipoPrenda, MaterialPrenda> = {
  camisa: 'algodon',
  polo: 'punto',
  sweater: 'punto',
  blazer: 'lana',
  chaleco: 'lana',
  abrigo: 'lana',
  chaqueta: 'algodon',
  traje: 'lana',
  pantalon: 'lana',
  zapato: 'cuero',
  cinturon: 'cuero',
  corbata: 'lana',
  billetera: 'cuero',
};
