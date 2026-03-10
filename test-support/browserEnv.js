export function installMockWindow(seed = {}) {
  const previousWindow = globalThis.window;
  const store = new Map(Object.entries(seed));
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };

  globalThis.window = { ...(previousWindow ?? {}), localStorage };

  return {
    localStorage,
    store,
    restore() {
      if (previousWindow === undefined) {
        delete globalThis.window;
        return;
      }
      globalThis.window = previousWindow;
    }
  };
}
