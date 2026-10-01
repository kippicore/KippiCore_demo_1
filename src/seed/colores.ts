import type { Color } from '@/dominio/tipos';

/**
 * Paleta de producto (PLAN 8.1.4): solo para ilustraciones de prenda, muestras y chips, nunca para la interfaz.
 * Se agregan a la tabla de 8.1.4 la mostaza (P6, "Blazer cruzado mostaza") y cuatro colores con patrón
 * (rayas y cuadros) para camisas, polos, corbatas y trajes (DECISIONES 01/10/2026).
 */
export const COLORES: Color[] = [
  { id: 'col_bla', nombre: 'Blanco', codigo: 'BLA', hex: '#F4F2EE', patron: 'liso' },
  { id: 'col_mfl', nombre: 'Marfil', codigo: 'MFL', hex: '#E9E2D3', patron: 'liso' },
  { id: 'col_azc', nombre: 'Azul cielo', codigo: 'AZC', hex: '#B9CBE0', patron: 'liso' },
  { id: 'col_azm', nombre: 'Azul medio', codigo: 'AZM', hex: '#5A7499', patron: 'liso' },
  { id: 'col_azn', nombre: 'Azul marino', codigo: 'AZN', hex: '#1F2A44', patron: 'liso' },
  { id: 'col_neg', nombre: 'Negro', codigo: 'NEG', hex: '#161616', patron: 'liso' },
  { id: 'col_grc', nombre: 'Gris claro', codigo: 'GRC', hex: '#C9C9C7', patron: 'liso' },
  { id: 'col_grm', nombre: 'Gris medio', codigo: 'GRM', hex: '#8A8A88', patron: 'liso' },
  { id: 'col_car', nombre: 'Carbón', codigo: 'CAR', hex: '#3B3B3B', patron: 'liso' },
  { id: 'col_are', nombre: 'Arena', codigo: 'ARE', hex: '#D6C7AE', patron: 'liso' },
  { id: 'col_cml', nombre: 'Camel', codigo: 'CML', hex: '#A67C52', patron: 'liso' },
  { id: 'col_caf', nombre: 'Café', codigo: 'CAF', hex: '#5A4033', patron: 'liso' },
  { id: 'col_oli', nombre: 'Verde oliva', codigo: 'OLI', hex: '#5B5E3F', patron: 'liso' },
  { id: 'col_vbo', nombre: 'Verde botella', codigo: 'VBO', hex: '#23392F', patron: 'liso' },
  { id: 'col_vin', nombre: 'Vinotinto', codigo: 'VIN', hex: '#5E1F2A', patron: 'liso' },
  { id: 'col_rsp', nombre: 'Rosa palo', codigo: 'RSP', hex: '#E3C6C0', patron: 'liso' },
  { id: 'col_mos', nombre: 'Mostaza', codigo: 'MOS', hex: '#B08D3E', patron: 'liso' },
  { id: 'col_raz', nombre: 'Rayas azul cielo', codigo: 'RAZ', hex: '#B9CBE0', patron: 'rayas' },
  { id: 'col_ram', nombre: 'Rayas azul marino', codigo: 'RAM', hex: '#1F2A44', patron: 'rayas' },
  { id: 'col_cuz', nombre: 'Cuadros azul marino', codigo: 'CUZ', hex: '#1F2A44', patron: 'cuadros' },
  { id: 'col_cuc', nombre: 'Cuadros café', codigo: 'CUC', hex: '#5A4033', patron: 'cuadros' },
];

/** Familias de color para el análisis (P12: "azul" = azul cielo + azul medio + azul marino + rayas azules). */
export const FAMILIA_COLOR: Record<string, string> = {
  col_bla: 'blanco',
  col_mfl: 'blanco',
  col_azc: 'azul',
  col_azm: 'azul',
  col_azn: 'azul',
  col_raz: 'azul',
  col_ram: 'azul',
  col_cuz: 'azul',
  col_neg: 'negro',
  col_grc: 'gris',
  col_grm: 'gris',
  col_car: 'gris',
  col_are: 'beige',
  col_cml: 'camel',
  col_caf: 'café',
  col_cuc: 'café',
  col_oli: 'verde',
  col_vbo: 'verde',
  col_vin: 'rojo',
  col_rsp: 'rosa',
  col_mos: 'amarillo',
};
