import type { KpiType } from '@/domain/entities';

// Formata um valor de KPI conforme o seu tipo, para exibição na UI.
// O backend computa todo o progresso — o app apenas formata para leitura.
//
//   number   → o número como está          (ex.: 42)
//   percent  → `${v}%`                       (ex.: 80%)
//   currency → `R$ ${v}`                     (ex.: R$ 1500)
//   time     → `${v}h`                       (ex.: 10h)
//   weight   → `${v} kg`                     (ex.: 75 kg)
//   quantity → `${v}`                        (ex.: 12)
//   custom   → `${v} ${unit}`                (ex.: 30 páginas)
export function formatKpiValue(value: number, kpiType: KpiType, unit?: string | null): string {
  const v = formatNumber(value);
  switch (kpiType) {
    case 'percent':
      return `${v}%`;
    case 'currency':
      return `R$ ${v}`;
    case 'time':
      return `${v}h`;
    case 'weight':
      return `${v} kg`;
    case 'custom':
      return unit ? `${v} ${unit}` : v;
    case 'quantity':
    case 'number':
    default:
      return v;
  }
}

// Formata um percentual de progresso (0..1) como inteiro arredondado: 0.8 → "80%".
export function formatProgressPercent(progress: number): string {
  const clamped = Math.max(0, Math.min(1, progress || 0));
  return `${Math.round(clamped * 100)}%`;
}

// Remove casas decimais desnecessárias mantendo no máximo 2 (separador local pt-BR).
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}
