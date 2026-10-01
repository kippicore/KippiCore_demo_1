/**
 * Plantillas de los hallazgos automáticos (PLAN 4.7, 7.12). Las cifras las pone `selHallazgos` con los datos
 * reales; si un patrón no aplica en la fecha, se elige otro (siempre ≥ 3 frases). Huecos con {{clave}}.
 */
export interface PlantillaHallazgo {
  id: string;
  patron: string;
  plantilla: string;
  enlace: string;
}

export const HALLAZGOS: PlantillaHallazgo[] = [
  {
    id: 'ticket-vs-volumen',
    patron: 'P1',
    plantilla:
      '{{localTicket}} hace menos ventas que {{localVolumen}}, pero cada una vale {{veces}} veces más.',
    enlace: '/panel/analisis/locales',
  },
  {
    id: 'vendedora-estrella',
    patron: 'P2',
    plantilla: '{{vendedor}} vende {{porcentaje}} más que el promedio del equipo. {{fraseAccesorio}}',
    enlace: '/panel/analisis/locales',
  },
  {
    id: 'talla-agotada',
    patron: 'P3',
    plantilla:
      'Las camisas talla {{talla}} en {{color}} se agotan antes que el resto: considera pedir {{porcentaje}} más en el próximo pedido.',
    enlace: '/panel/analisis/productos',
  },
  {
    id: 'tallas-pantalon',
    patron: 'P4',
    plantilla: '{{proporcion}} pantalones que vendes son talla {{tallaA}} o {{tallaB}}.',
    enlace: '/panel/analisis/productos',
  },
  {
    id: 'categoria-dormida',
    patron: 'P5',
    plantilla:
      'Tienes {{valor}} quietos en {{categoria}}: a este ritmo tardarías más de {{meses}} meses en venderlo.',
    enlace: '/panel/analisis/productos',
  },
  {
    id: 'sabado-tarde',
    patron: 'P7',
    plantilla:
      'Entre 3 y 7 p. m. de los sábados —menos del {{porcentajeHoras}} de las horas que abres— haces el {{porcentajeVentas}} de tus ventas.',
    enlace: '/panel/analisis',
  },
  {
    id: 'domingo-por-local',
    patron: 'P8',
    plantilla:
      'Los domingos, {{localFuerte}} vende {{porcentaje}} más que {{localDebil}}. Vale la pena reforzar el turno.',
    enlace: '/panel/analisis/locales',
  },
  {
    id: 'pagos-digitales',
    patron: 'P9',
    plantilla:
      'Los pagos por Nequi, Daviplata y Bre-B pasaron del {{antes}} al {{ahora}} de tus ventas en un año, y no te cobran comisión de datáfono.',
    enlace: '/panel/analisis',
  },
  {
    id: 'datafono',
    patron: 'P10',
    plantilla:
      'El mes pasado vendiste {{vendido}} con tarjeta y te consignaron {{consignado}}: {{comision}} de comisión y {{retenciones}} de retenciones que puedes descontar.',
    enlace: '/panel/pagos/datafono',
  },
  {
    id: 'vip-en-riesgo',
    patron: 'P11',
    plantilla:
      '{{cantidad}} clientes que te han comprado más de {{umbral}} no vuelven hace más de 90 días. Escríbeles.',
    enlace: '/panel/clientes',
  },
  {
    id: 'colores',
    patron: 'P12',
    plantilla: 'El {{color}} es {{proporcion}} camisas que vendes.',
    enlace: '/panel/analisis/productos',
  },
  {
    id: 'dolar-margen',
    patron: 'P13',
    plantilla:
      'Por la tasa de cambio, los {{categoria}} del último pedido te dejan {{puntos}} puntos menos de margen.',
    enlace: '/panel/importaciones',
  },
  {
    id: 'fabrica-incumplida',
    patron: 'P14',
    plantilla:
      '{{fabrica}} llega en promedio {{dias}} días tarde y tiene {{veces}} veces más defectos que {{mejorFabrica}}.',
    enlace: '/panel/proveedores/comparativo',
  },
  {
    id: 'nomina-por-local',
    patron: 'P15',
    plantilla:
      'La nómina de {{localAlto}} equivale al {{pctAlto}} de lo que vende; en {{localBajo}}, al {{pctBajo}}.',
    enlace: '/panel/personal',
  },
  {
    id: 'proyeccion-mes',
    patron: 'P18',
    plantilla: 'A este ritmo, cerrarías {{mes}} en {{proyeccion}}, {{variacion}} que {{mes}} del año pasado.',
    enlace: '/panel/analisis',
  },
];

export const FRASE_ACCESORIO = 'Casi la mitad de sus ventas incluye un accesorio.';
