/**
 * Asset loading.
 *
 * All content is JSON under /data. Images are loaded lazily and cached; when a
 * sprite has no art yet the generator in gfx/spritegen produces a deterministic
 * placeholder so the game is always playable during content passes.
 */

export class AssetManager {
  private json = new Map<string, unknown>();
  private images = new Map<string, HTMLImageElement>();
  private pending = new Map<string, Promise<unknown>>();
  private failedImages = new Set<string>();

  constructor(private base = '') {}

  /** Fetch and cache a JSON file. Concurrent requests share one promise. */
  async loadJson<T>(path: string): Promise<T> {
    const cached = this.json.get(path);
    if (cached !== undefined) return cached as T;

    const inflight = this.pending.get(path);
    if (inflight) return inflight as Promise<T>;

    const p = (async () => {
      const res = await fetch(this.base + path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`asset: ${path} -> HTTP ${res.status}`);
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch (e) {
        throw new Error(`asset: ${path} is not valid JSON (${(e as Error).message})`);
      }
      this.json.set(path, parsed);
      this.pending.delete(path);
      return parsed;
    })();

    this.pending.set(path, p);
    return p as Promise<T>;
  }

  /** Already-loaded JSON, or undefined. */
  getJson<T>(path: string): T | undefined {
    return this.json.get(path) as T | undefined;
  }

  /** Load many JSON files at once. */
  async loadAllJson(paths: string[]): Promise<void> {
    await Promise.all(paths.map((p) => this.loadJson(p)));
  }

  /**
   * Images resolve to null rather than throwing when missing: a missing sprite
   * must never take the game down mid-battle.
   */
  loadImage(path: string): Promise<HTMLImageElement | null> {
    const cached = this.images.get(path);
    if (cached) return Promise.resolve(cached);
    if (this.failedImages.has(path)) return Promise.resolve(null);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(path, img);
        resolve(img);
      };
      img.onerror = () => {
        this.failedImages.add(path);
        console.warn(`asset: image not found, using placeholder for ${path}`);
        resolve(null);
      };
      img.src = this.base + path;
    });
  }

  getImage(path: string): HTMLImageElement | undefined {
    return this.images.get(path);
  }

  /** Drop cached maps when moving between regions to keep memory flat. */
  evictJson(prefix: string): void {
    for (const key of [...this.json.keys()]) {
      if (key.startsWith(prefix)) this.json.delete(key);
    }
  }

  stats(): { json: number; images: number; failed: number } {
    return { json: this.json.size, images: this.images.size, failed: this.failedImages.size };
  }
}
