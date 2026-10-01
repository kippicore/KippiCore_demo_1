"""Contornos vectoriales de textos en Figtree (OFL) para los SVG fuente de íconos y Open Graph (F2-C).

Uso: python3 scripts/contornos-wordmark.py  → escribe scripts/contornos-wordmark.json
Los SVG fuente no dependen de fuentes instaladas: el texto va como trazados (render idéntico en sharp/librsvg).
"""
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES = os.path.join(RAIZ, 'src', 'lib', 'exportar', 'fuentes')

def contorno(texto, archivo, tracking_em=0.0):
    f = TTFont(os.path.join(FUENTES, archivo))
    upm = f['head'].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f['hmtx']
    x = 0.0
    partes = []
    for i, ch in enumerate(texto):
        g = cmap.get(ord(ch))
        if g is None:
            continue
        pen = SVGPathPen(gs)
        # y hacia abajo: escala (1, -1); la línea base queda en y = 0
        tp = TransformPen(pen, (1, 0, 0, -1, x, 0))
        gs[g].draw(tp)
        partes.append(pen.getCommands())
        x += hmtx[g][0]
        if i < len(texto) - 1:
            x += tracking_em * upm
    return {'d': ' '.join(partes), 'ancho': x, 'upm': upm, 'capHeight': getattr(f['OS/2'], 'sCapHeight', 700)}

salida = {
    'HALDEN': contorno('HALDEN', 'Figtree-Black.ttf', 0.18),
    'H': contorno('H', 'Figtree-Black.ttf', 0),
    'MODA MASCULINA · BOGOTÁ': contorno('MODA MASCULINA · BOGOTÁ', 'Figtree-Bold.ttf', 0.12),
    'ASÍ SE VERÍA TU NEGOCIO': contorno('ASÍ SE VERÍA TU NEGOCIO', 'Figtree-Black.ttf', 0),
    'EN UN SOLO LUGAR': contorno('EN UN SOLO LUGAR', 'Figtree-Black.ttf', 0),
    'KIPPICORE CRM · DEMO CON DATOS DE EJEMPLO': contorno('KIPPICORE CRM · DEMO CON DATOS DE EJEMPLO', 'Figtree-Bold.ttf', 0.12),
}
with open(os.path.join(RAIZ, 'scripts', 'contornos-wordmark.json'), 'w') as fh:
    json.dump(salida, fh)
print('ok', {k: round(v['ancho']) for k, v in salida.items()})
