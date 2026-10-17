import jexl from 'jexl';

const ALLOWED_OPERATORS = new Set(['==', '!=', '>', '<', '>=', '<=']);

function toComparable(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

export async function evaluateComparison(
  left: unknown,
  operator: string,
  right: unknown
): Promise<boolean> {
  if (!ALLOWED_OPERATORS.has(operator)) return false;

  try {
    const result = await jexl.eval(`left ${operator} right`, {
      left: toComparable(left),
      right: toComparable(right)
    });
    return Boolean(result);
  } catch {
    return false;
  }
}

export function evaluateContains(left: unknown, right: unknown): boolean {
  return String(left ?? '').includes(String(right ?? ''));
}

export function evaluateEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function safeRegex(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (/\([^)]*[+*][^)]*\)[+*{]/.test(trimmed)) return null;

  try {
    return new RegExp(trimmed, 'i');
  } catch {
    return null;
  }
}
