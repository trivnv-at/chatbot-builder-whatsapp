import type { OfficeHours } from '../types.js';

export function isWithinOfficeHours(iso: string, hours: OfficeHours): boolean {
  if (!hours.enabled) return true;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;

  const hour = date.getHours();
  if (hours.startHour <= hours.endHour) {
    return hour >= hours.startHour && hour < hours.endHour;
  }
  return hour >= hours.startHour || hour < hours.endHour;
}
