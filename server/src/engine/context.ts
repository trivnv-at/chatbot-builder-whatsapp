export function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

const TEMPLATE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function resolveTemplate(value: unknown, vars: Record<string, unknown>): unknown {
  if (typeof value !== 'string') return value;

  const exact = value.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (exact) return getPath(vars, exact[1]);

  return value.replace(TEMPLATE_PATTERN, (_match, path: string) => {
    const resolved = getPath(vars, path);
    return resolved === undefined || resolved === null ? '' : String(resolved);
  });
}

export function resolveText(value: unknown, vars: Record<string, unknown>): string {
  const resolved = resolveTemplate(value, vars);
  return resolved === undefined || resolved === null ? '' : String(resolved);
}
