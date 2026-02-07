import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { isNil } from 'src/common/utils';

@Injectable()
export class MemoryCacheService {
  /**
   * Tracks in-flight getOrSet requests to prevent duplicate factory calls
   * when multiple requests for the same key arrive concurrently.
   */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Get a value from the cache.
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in the cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (optional)
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  /**
   * Delete a value from the cache.
   */
  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /**
   * Get a value from the cache, or compute and cache it if not present.
   *
   * This method handles concurrent requests for the same key by coalescing
   * them into a single factory call. If multiple requests arrive while
   * the factory is executing, they will all receive the same result.
   *
   * @param key - Cache key
   * @param factory - Function to compute the value if not cached
   * @param ttlMs - Time to live in milliseconds (optional)
   */
  async getOrSet<T>(
    key: string,
    factory: () => T | Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.cache.get<T>(key);
    if (!isNil(cached)) {
      return cached;
    }

    // Check if there's already an in-flight request for this key
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      return inFlightPromise as Promise<T>;
    }

    // Create and track the in-flight request
    const promise = (async () => {
      try {
        // Double-check cache in case it was populated while we were waiting
        const rechecked = await this.cache.get<T>(key);
        if (!isNil(rechecked)) {
          return rechecked;
        }

        const value = await factory();
        await this.cache.set(key, value, ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Wrap a function with caching. The key is derived from the provided key generator.
   * @param keyGenerator - Function to generate cache key from arguments
   * @param fn - Function to wrap
   * @param ttlMs - Time to live in milliseconds (optional)
   */
  wrap<TArgs extends unknown[], TResult>(
    keyGenerator: (...args: TArgs) => string,
    fn: (...args: TArgs) => TResult | Promise<TResult>,
    ttlMs?: number,
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), ttlMs);
    };
  }

  /**
   * Clear all entries from the cache.
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }
}
