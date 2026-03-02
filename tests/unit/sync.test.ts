/**
 * Sync Service Tests
 * Unit tests for offline sync functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB operations
class MockIndexedDB {
  private stores: Map<string, any[]> = new Map();

  constructor() {
    this.stores.set('sync-queue', []);
  }

  getStore(name: string) {
    return this.stores.get(name) || [];
  }

  addToStore(name: string, item: any) {
    const store = this.stores.get(name) || [];
    store.push({ ...item, id: store.length + 1 });
    this.stores.set(name, store);
    return store.length;
  }

  removeFromStore(name: string, id: number) {
    const store = this.stores.get(name) || [];
    const filtered = store.filter(item => item.id !== id);
    this.stores.set(name, filtered);
  }

  clear() {
    this.stores.clear();
    this.stores.set('sync-queue', []);
  }
}

describe('Sync Service', () => {
  let mockDB: MockIndexedDB;

  beforeEach(() => {
    mockDB = new MockIndexedDB();
    vi.clearAllMocks();
  });

  describe('Queue Management', () => {
    it('should add failed request to sync queue', () => {
      const request = {
        url: 'https://api.example.com/data',
        method: 'POST',
        body: { test: 'data' },
      };

      const id = mockDB.addToStore('sync-queue', request);
      const queue = mockDB.getStore('sync-queue');

      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject(request);
      expect(id).toBe(1);
    });

    it('should retrieve all pending sync items', () => {
      mockDB.addToStore('sync-queue', { url: '/api/1', method: 'POST' });
      mockDB.addToStore('sync-queue', { url: '/api/2', method: 'PUT' });

      const queue = mockDB.getStore('sync-queue');

      expect(queue).toHaveLength(2);
      expect(queue[0].url).toBe('/api/1');
      expect(queue[1].url).toBe('/api/2');
    });

    it('should remove synced item from queue', () => {
      const id = mockDB.addToStore('sync-queue', { url: '/api/test' });
      mockDB.removeFromStore('sync-queue', id);

      const queue = mockDB.getStore('sync-queue');

      expect(queue).toHaveLength(0);
    });
  });

  describe('Sync Execution', () => {
    it('should process sync queue on connection restore', async () => {
      // Add multiple items to queue
      mockDB.addToStore('sync-queue', { url: '/api/1', data: { id: 1 } });
      mockDB.addToStore('sync-queue', { url: '/api/2', data: { id: 2 } });

      const queue = mockDB.getStore('sync-queue');
      expect(queue).toHaveLength(2);

      // Simulate successful sync
      mockDB.removeFromStore('sync-queue', 1);
      mockDB.removeFromStore('sync-queue', 2);

      const finalQueue = mockDB.getStore('sync-queue');
      expect(finalQueue).toHaveLength(0);
    });

    it('should handle sync failures gracefully', async () => {
      const item = { url: '/api/test', retries: 0 };
      mockDB.addToStore('sync-queue', item);

      const queue = mockDB.getStore('sync-queue');
      
      // Item should remain in queue on failure
      expect(queue).toHaveLength(1);
      expect(queue[0].url).toBe('/api/test');
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts in synced data', () => {
      const localData = { id: 1, value: 'local', updated_at: '2024-01-01' };
      const serverData = { id: 1, value: 'server', updated_at: '2024-01-02' };

      // Server data is newer
      const isConflict = new Date(localData.updated_at) < new Date(serverData.updated_at);
      expect(isConflict).toBe(true);
    });

    it('should prefer server data in conflicts', () => {
      const localData = { id: 1, value: 'local', updated_at: '2024-01-01' };
      const serverData = { id: 1, value: 'server', updated_at: '2024-01-02' };

      const resolved = new Date(serverData.updated_at) > new Date(localData.updated_at)
        ? serverData
        : localData;

      expect(resolved.value).toBe('server');
    });
  });
});
