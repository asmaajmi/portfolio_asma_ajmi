// In-memory sliding-window rate limiter keyed by client IP.
// Good enough for a single-instance portfolio server; use a shared store (Redis…) if you scale out.
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();

  function prune(key, t) {
    const list = (hits.get(key) || []).filter((ts) => t - ts < windowMs);
    if (list.length) hits.set(key, list);
    else hits.delete(key);
    return list;
  }

  return {
    /** @returns {{ allowed: boolean, retryAfterSeconds: number }} */
    check(key) {
      const t = now();
      const list = prune(key, t);
      if (list.length >= limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((list[0] + windowMs - t) / 1000)) };
      }
      list.push(t);
      hits.set(key, list);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    sweep() {
      const t = now();
      for (const key of [...hits.keys()]) prune(key, t);
    },
    size: () => hits.size
  };
}
