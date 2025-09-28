import type { BaseQueryFn } from '@reduxjs/toolkit/query/react';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl?: number; // time to live in milliseconds
}

class IDBCache {
  private dbName = 'lctCache';
  private version = 1;
  private storeName = 'cache';

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async get(key: string): Promise<any | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result;
          if (entry) {
            const now = Date.now();
            if (entry.ttl && now - entry.timestamp > entry.ttl) {
              // Expired, remove it
              this.delete(key);
              resolve(null);
            } else {
              resolve(entry.data);
            }
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('IDB get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
      };
      store.put(entry);
    } catch (error) {
      console.warn('IDB set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(key);
    } catch (error) {
      console.warn('IDB delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
    } catch (error) {
      console.warn('IDB clear error:', error);
    }
  }
}

export const idbCache = new IDBCache();

// Optional: Create a base query enhancer for RTK Query
export const withIDBCache = <T extends BaseQueryFn>(
  baseQuery: T,
  cacheConfig: { ttl?: number; enabled?: boolean } = {}
) => {
  const { ttl = 5 * 60 * 1000, enabled = true } = cacheConfig; // 5 minutes default TTL

  return async (args: any, api: any, extraOptions: any) => {
    if (!enabled) {
      return baseQuery(args, api, extraOptions);
    }

    const key = JSON.stringify(args);
    const cached = await idbCache.get(key);
    if (cached) {
      return { data: cached };
    }

    const result = await baseQuery(args, api, extraOptions);
    if (result.data) {
      idbCache.set(key, result.data, ttl);
    }
    return result;
  };
};
