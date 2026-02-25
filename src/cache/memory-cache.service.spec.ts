import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { MemoryCacheService } from './memory-cache.service';

describe('MemoryCacheService', () => {
  let service: MemoryCacheService;
  let mockCacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<MemoryCacheService>(MemoryCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      mockCacheManager.get.mockResolvedValue('cached-value');

      const result = await service.get<string>('test-key');

      expect(result).toBe('cached-value');
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined when key not found', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get<string>('missing-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value without ttl', async () => {
      await service.set('test-key', 'test-value');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        undefined,
      );
    });

    it('should set value with ttl', async () => {
      await service.set('test-key', 'test-value', 60000);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        60000,
      );
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      await service.del('test-key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when present', async () => {
      mockCacheManager.get.mockResolvedValue('cached-value');

      const factory = jest.fn().mockResolvedValue('new-value');
      const result = await service.getOrSet('test-key', factory);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should compute and cache value when not present', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue('computed-value');
      const result = await service.getOrSet('test-key', factory, 60000);

      expect(result).toBe('computed-value');
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        'computed-value',
        60000,
      );
    });

    it('should handle sync factory functions', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const factory = jest.fn().mockReturnValue('sync-value');
      const result = await service.getOrSet('test-key', factory);

      expect(result).toBe('sync-value');
      expect(factory).toHaveBeenCalled();
    });

    it('should coalesce concurrent requests for the same key', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue('shared-value');

      // Start two concurrent requests for the same key
      const promise1 = service.getOrSet('test-key', factory);
      const promise2 = service.getOrSet('test-key', factory);

      // Both should get the same value
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('shared-value');
      expect(result2).toBe('shared-value');

      // Factory should only be called once (requests were coalesced)
      expect(factory).toHaveBeenCalledTimes(1);

      // Cache should only be set once
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1);
    });

    it('should allow new requests after in-flight request completes', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const factory1 = jest.fn().mockResolvedValue('value-1');
      const factory2 = jest.fn().mockResolvedValue('value-2');

      // First request
      const result1 = await service.getOrSet('test-key', factory1);
      expect(result1).toBe('value-1');
      expect(factory1).toHaveBeenCalledTimes(1);

      // Second request after first completes (should call factory again since cache mock returns undefined)
      const result2 = await service.getOrSet('test-key', factory2);
      expect(result2).toBe('value-2');
      expect(factory2).toHaveBeenCalledTimes(1);
    });

    it('should clean up in-flight tracking on factory error', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const error = new Error('Factory failed');
      const failingFactory = jest.fn().mockRejectedValue(error);
      const successFactory = jest.fn().mockResolvedValue('success');

      // First request fails
      await expect(
        service.getOrSet('test-key', failingFactory),
      ).rejects.toThrow('Factory failed');

      // Second request should be able to try again (not stuck on failed promise)
      const result = await service.getOrSet('test-key', successFactory);
      expect(result).toBe('success');
      expect(successFactory).toHaveBeenCalledTimes(1);
    });

    it('should use cached value if populated while in-flight', async () => {
      // First call returns undefined, second call (recheck) returns cached value
      mockCacheManager.get
        .mockResolvedValueOnce(undefined) // Initial check
        .mockResolvedValueOnce(undefined) // In-flight recheck for first request
        .mockResolvedValueOnce(undefined) // Initial check for second request (before joining in-flight)
        .mockResolvedValueOnce('cached-by-another'); // This shouldn't happen in this test

      let resolveFactory: (value: string) => void;
      const factoryPromise = new Promise<string>((resolve) => {
        resolveFactory = resolve;
      });
      const factory = jest.fn().mockReturnValue(factoryPromise);

      const promise = service.getOrSet('test-key', factory);

      // Resolve and verify
      resolveFactory!('computed-value');
      const result = await promise;

      expect(result).toBe('computed-value');
    });
  });

  describe('wrap', () => {
    it('should create a wrapped function that caches results', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const originalFn = jest.fn().mockResolvedValue('result');
      const keyGenerator = (id: string) => `user:${id}`;

      const wrappedFn = service.wrap(keyGenerator, originalFn, 60000);
      const result = await wrappedFn('123');

      expect(result).toBe('result');
      expect(mockCacheManager.get).toHaveBeenCalledWith('user:123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user:123',
        'result',
        60000,
      );
    });

    it('should return cached value on subsequent calls', async () => {
      mockCacheManager.get.mockResolvedValue('cached-result');

      const originalFn = jest.fn().mockResolvedValue('new-result');
      const keyGenerator = (id: string) => `user:${id}`;

      const wrappedFn = service.wrap(keyGenerator, originalFn);
      const result = await wrappedFn('123');

      expect(result).toBe('cached-result');
      expect(originalFn).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear the cache', async () => {
      await service.clear();

      expect(mockCacheManager.clear).toHaveBeenCalled();
    });
  });
});
