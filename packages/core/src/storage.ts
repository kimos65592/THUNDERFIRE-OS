export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

export class IndexedDbStorage implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase>;

  constructor(
    private dbName = "jarvis-db",
    private storeName = "kv"
  ) {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(storeName);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const request = tx.objectStore(this.storeName).get(key);

      request.onsuccess = () =>
        resolve(request.result as T | undefined);

      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");

      tx.objectStore(this.storeName).put(value, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");

      tx.objectStore(this.storeName).delete(key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
