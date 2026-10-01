import {
  BadgePercent,
  CalendarDays,
  ChartColumn,
  Clock,
  Contact,
  Ellipsis,
  Factory,
  FileDown,
  FileText,
  HandCoins,
  House,
  MessagesSquare,
  ReceiptText,
  ScanBarcode,
  Settings2,
  Ship,
  Shirt,
  Sun,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Íconos de la navegación (config/navegacion.ts guarda el nombre; 8.4.2, 8.5.3). Solo los que se usan. */
export const ICONOS_NAVEGACION: Record<string, LucideIcon> = {
  BadgePercent,
  CalendarDays,
  ChartColumn,
  Clock,
  Contact,
  Ellipsis,
  Factory,
  FileDown,
  FileText,
  HandCoins,
  House,
  MessagesSquare,
  ReceiptText,
  ScanBarcode,
  Settings2,
  Ship,
  Shirt,
  Sun,
  Users,
  Wallet,
};

export function iconoNavegacion(nombre: string): LucideIcon {
  return ICONOS_NAVEGACION[nombre] ?? House;
}
