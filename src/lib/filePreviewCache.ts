import { getApiUrl } from './config';
import { getAccessToken } from './auth';

const DB_NAME = 'liteflow_file_cache';
const STORE_NAME = 'files';
const DB_VERSION = 1;

const L1_MAX_BYTES = 50 * 1024 * 1024;
const L1_MAX_ENTRIES = 50;
const L2_MAX_BYTES = 200 * 1024 * 1024;
const SKIP_THRESHOLD = 20 * 1024 * 1024;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheKey = string;

interface CacheEntry {
  key: CacheKey;
  blob: Blob;
  etag?: string;
  mime: string;
  size: number;
  createdAt: number;
  lastAccessAt: number;
}

const cacheKey = (conversationId: string, filePath: string): CacheKey =>
  `${conversationId}::${filePath}`;

class L1LRU {
  private map = new Map<CacheKey, CacheEntry>();
  private bytes = 0;

  get(key: CacheKey): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    this.map.delete(key);
    entry.lastAccessAt = Date.now();
    this.map.set(key, entry);
    return entry;
  }

  set(entry: CacheEntry): void {
    const existing = this.map.get(entry.key);
    if (existing) {
      this.bytes -= existing.size;
      this.map.delete(entry.key);
    }
    this.map.set(entry.key, entry);
    this.bytes += entry.size;
    this.evict();
  }

  delete(key: CacheKey): void {
    const entry = this.map.get(key);
    if (!entry) return;
    this.bytes -= entry.size;
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.bytes = 0;
  }

  private evict(): void {
    while (
      (this.bytes > L1_MAX_BYTES || this.map.size > L1_MAX_ENTRIES) &&
      this.map.size > 0
    ) {
      const oldestKey = this.map.keys().next().value as CacheKey | undefined;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }
  }
}

const l1 = new L1LRU();

let dbPromise: Promise<IDBDatabase | null> | null = null;
let pruneStarted = false;

function isIDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB(): Promise<IDBDatabase | null> {
  if (!isIDBAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('lastAccessAt', 'lastAccessAt');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

async function idbGet(key: CacheKey): Promise<CacheEntry | undefined> {
  const db = await openDB();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const req = tx(db, 'readonly').get(key);
    req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
    req.onerror = () => resolve(undefined);
  });
}

async function idbPut(entry: CacheEntry): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readwrite').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function idbDelete(key: CacheKey): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readwrite').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function idbTouch(key: CacheKey): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const store = tx(db, 'readwrite');
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const entry = getReq.result as CacheEntry | undefined;
      if (!entry) {
        resolve();
        return;
      }
      entry.lastAccessAt = Date.now();
      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => resolve();
    };
    getReq.onerror = () => resolve();
  });
}

async function idbPrune(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const now = Date.now();
  const expireBefore = now - TTL_MS;

  await new Promise<void>((resolve) => {
    const store = tx(db, 'readwrite');
    const idx = store.index('createdAt');
    const range = IDBKeyRange.upperBound(expireBefore);
    const req = idx.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => resolve();
  });

  let totalBytes = 0;
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readonly').openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const entry = cursor.value as CacheEntry;
        totalBytes += entry.size;
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => resolve();
  });

  let estimateQuota = Infinity;
  let estimateUsage = 0;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      estimateQuota = est.quota ?? Infinity;
      estimateUsage = est.usage ?? 0;
    } catch {
      // ignore
    }
  }
  const quotaPressure =
    estimateQuota !== Infinity && estimateQuota - estimateUsage < 50 * 1024 * 1024;

  if (totalBytes <= L2_MAX_BYTES && !quotaPressure) return;

  const target = quotaPressure ? L2_MAX_BYTES / 2 : L2_MAX_BYTES * 0.8;
  await new Promise<void>((resolve) => {
    const store = tx(db, 'readwrite');
    const idx = store.index('lastAccessAt');
    const req = idx.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || totalBytes <= target) {
        resolve();
        return;
      }
      const entry = cursor.value as CacheEntry;
      totalBytes -= entry.size;
      cursor.delete();
      cursor.continue();
    };
    req.onerror = () => resolve();
  });
}

function ensurePruneOnce(): void {
  if (pruneStarted || !isIDBAvailable()) return;
  pruneStarted = true;
  void idbPrune().catch(() => undefined);
}

const pending = new Map<CacheKey, Promise<CacheEntry>>();

async function fetchFromNetwork(
  key: CacheKey,
  conversationId: string,
  filePath: string,
  knownEtag: string | undefined,
  cachedBlob: Blob | undefined,
): Promise<CacheEntry> {
  const url = getApiUrl(
    `/api/conversations/${conversationId}/files/download?path=${encodeURIComponent(filePath)}`,
  );
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (knownEtag && cachedBlob) headers['If-None-Match'] = knownEtag;

  const res = await fetch(url, { headers });

  if (res.status === 304 && cachedBlob) {
    const now = Date.now();
    const entry: CacheEntry = {
      key,
      blob: cachedBlob,
      etag: knownEtag,
      mime: cachedBlob.type,
      size: cachedBlob.size,
      createdAt: now,
      lastAccessAt: now,
    };
    l1.set(entry);
    void idbTouch(key);
    return entry;
  }

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const blob = await res.blob();
  const now = Date.now();
  const entry: CacheEntry = {
    key,
    blob,
    etag: res.headers.get('ETag') ?? undefined,
    mime: blob.type || 'application/octet-stream',
    size: blob.size,
    createdAt: now,
    lastAccessAt: now,
  };

  if (blob.size <= SKIP_THRESHOLD) {
    l1.set(entry);
    void idbPut(entry);
  }
  return entry;
}

export async function getFile(
  conversationId: string,
  filePath: string,
): Promise<{ blob: Blob; etag?: string; mime: string }> {
  ensurePruneOnce();
  const key = cacheKey(conversationId, filePath);

  const memHit = l1.get(key);
  if (memHit) {
    return { blob: memHit.blob, etag: memHit.etag, mime: memHit.mime };
  }

  const inFlight = pending.get(key);
  if (inFlight) {
    const entry = await inFlight;
    return { blob: entry.blob, etag: entry.etag, mime: entry.mime };
  }

  const promise = (async () => {
    const idbHit = await idbGet(key);
    if (idbHit) {
      l1.set({ ...idbHit, lastAccessAt: Date.now() });
      void idbTouch(key);
      void revalidateInBackground(key, conversationId, filePath, idbHit);
      return idbHit;
    }
    return fetchFromNetwork(key, conversationId, filePath, undefined, undefined);
  })();

  pending.set(key, promise);
  try {
    const entry = await promise;
    return { blob: entry.blob, etag: entry.etag, mime: entry.mime };
  } finally {
    pending.delete(key);
  }
}

function revalidateInBackground(
  key: CacheKey,
  conversationId: string,
  filePath: string,
  cached: CacheEntry,
): Promise<void> {
  if (!cached.etag) return Promise.resolve();
  return fetchFromNetwork(key, conversationId, filePath, cached.etag, cached.blob)
    .then(() => undefined)
    .catch(() => undefined);
}

export async function getText(
  conversationId: string,
  filePath: string,
): Promise<string> {
  const { blob } = await getFile(conversationId, filePath);
  return blob.text();
}

export interface BlobUrlHandle {
  url: string;
  release: () => void;
}

export async function acquireBlobUrl(
  conversationId: string,
  filePath: string,
): Promise<BlobUrlHandle> {
  const { blob } = await getFile(conversationId, filePath);
  const url = URL.createObjectURL(blob);
  let released = false;
  return {
    url,
    release: () => {
      if (released) return;
      released = true;
      URL.revokeObjectURL(url);
    },
  };
}

export async function invalidate(
  conversationId: string,
  filePath: string,
): Promise<void> {
  const key = cacheKey(conversationId, filePath);
  l1.delete(key);
  await idbDelete(key);
}

export async function clearAll(): Promise<void> {
  l1.clear();
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = tx(db, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}
