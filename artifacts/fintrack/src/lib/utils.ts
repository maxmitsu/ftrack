import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  } catch (e) {
    return dateString;
  }
}

export const CATEGORY_COLORS = [
  '#1D9E75', '#378ADD', '#D85A30', '#BA7517', 
  '#D4537E', '#888780', '#7F77DD', '#E24B4A', '#00b8d4'
];

export const CATEGORY_ICONS: Record<string, string> = {
  'Comida': '🍽️',
  'Vivienda': '🏠',
  'Transporte': '⛽',
  'Entretenimiento': '🎬',
  'Salud': '💊',
  'Ingreso': '💼',
  'Ingreso extra': '💻',
  'Ahorro': '💰',
  'Otros': '📦',
  'Pago fijo': '🔔'
};

export function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export function getCategoryIcon(cat: string) {
  return CATEGORY_ICONS[cat] || '📦';
}
