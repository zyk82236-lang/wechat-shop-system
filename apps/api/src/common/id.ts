export function nowIso(): string {
  return new Date().toISOString();
}

export function genId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

export function genOrderNo(): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.floor(Math.random() * 899999 + 100000);
  return `${stamp}${rand}`;
}
