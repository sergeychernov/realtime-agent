// Утилиты сервера

// Маскировка длинных строк в глубоко вложенных объектах (для логирования JSON)
export function sanitizeStringsDeep(input: any, maxLen = 200): any {
  const seen = new WeakSet();
  const walk = (val: any): any => {
    if (typeof val === 'string') {
      return val.length > maxLen ? '...' : val;
    }
    if (Array.isArray(val)) {
      return val.map(walk);
    }
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      const out: any = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = walk(v);
      }
      return out;
    }
    return val;
  };
  return walk(input);
}