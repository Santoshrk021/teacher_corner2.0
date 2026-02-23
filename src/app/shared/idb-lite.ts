// idb-lite.ts
export class IDBLite {
  private dbp: Promise<IDBDatabase>;
  constructor(private dbName='ttac-quiz', private store='attempts') {
    this.dbp = new Promise((resolve, reject) => {
      const open = indexedDB.open(dbName, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(store);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
  }
  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readonly');
      const req = tx.objectStore(this.store).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }
  async set<T>(key: string, val: T): Promise<void> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).put(val as any, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async delete(key: string): Promise<void> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
