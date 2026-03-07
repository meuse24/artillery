export class ArcadeEventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(eventName, handler) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    const bucket = this.handlers.get(eventName);
    bucket.add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const bucket = this.handlers.get(eventName);
    if (!bucket) {
      return;
    }
    bucket.delete(handler);
    if (!bucket.size) {
      this.handlers.delete(eventName);
    }
  }

  emit(eventName, payload) {
    const bucket = this.handlers.get(eventName);
    if (!bucket || !bucket.size) {
      return;
    }
    [...bucket].forEach((handler) => handler(payload));
  }

  destroy() {
    this.handlers.clear();
  }
}
