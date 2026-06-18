const store = new Map();

export function readCache(key) {
  return store.get(key) ?? null;
}

export function writeCache(key, value) {
  store.set(key, value);
  return value;
}

export function resetCache() {
  store.clear();
}

export function listCacheKeys() {
  return [...store.keys()];
}
