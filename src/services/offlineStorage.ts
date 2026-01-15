/**
 * Offline Storage Service
 *
 * Provides IndexedDB-based local storage for offline-first functionality.
 * Includes a mutation queue for pending operations that sync when online.
 */

const DB_NAME = 'tradesman_offline_db';
const DB_VERSION = 1;

// Store names
const STORES = {
  QUOTES: 'quotes',
  CUSTOMERS: 'customers',
  SCHEDULE: 'schedule',
  JOB_PACKS: 'job_packs',
  EXPENSES: 'expenses',
  MUTATION_QUEUE: 'mutation_queue',
  SYNC_META: 'sync_meta',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

export interface PendingMutation {
  id: string;
  timestamp: number;
  type: 'create' | 'update' | 'delete';
  storeName: StoreName;
  entityId: string;
  data: any;
  retryCount: number;
  lastError?: string;
}

export interface SyncMeta {
  lastSyncTime: number;
  pendingCount: number;
  isOnline: boolean;
}

// Initialize the IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores for each entity type
      if (!db.objectStoreNames.contains(STORES.QUOTES)) {
        db.createObjectStore(STORES.QUOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SCHEDULE)) {
        db.createObjectStore(STORES.SCHEDULE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.JOB_PACKS)) {
        db.createObjectStore(STORES.JOB_PACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
      }

      // Mutation queue for offline operations
      if (!db.objectStoreNames.contains(STORES.MUTATION_QUEUE)) {
        const mutationStore = db.createObjectStore(STORES.MUTATION_QUEUE, { keyPath: 'id' });
        mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
        mutationStore.createIndex('storeName', 'storeName', { unique: false });
      }

      // Sync metadata
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
      }
    };
  });
}

// Generic get all from store
async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Generic get by ID
async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Generic put (create/update)
async function put<T extends { id: string }>(storeName: StoreName, data: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

// Generic delete
async function remove(storeName: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Bulk put for syncing data from server
async function bulkPut<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    let completed = 0;
    const total = items.length;

    if (total === 0) {
      resolve();
      return;
    }

    items.forEach(item => {
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
    });

    transaction.onerror = () => reject(transaction.error);
  });
}

// Clear a store
async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// MUTATION QUEUE
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function addToMutationQueue(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<PendingMutation> {
  const pendingMutation: PendingMutation = {
    ...mutation,
    id: generateId(),
    timestamp: Date.now(),
    retryCount: 0,
  };

  await put(STORES.MUTATION_QUEUE, pendingMutation);
  await updatePendingCount();
  return pendingMutation;
}

async function getPendingMutations(): Promise<PendingMutation[]> {
  const mutations = await getAll<PendingMutation>(STORES.MUTATION_QUEUE);
  return mutations.sort((a, b) => a.timestamp - b.timestamp);
}

async function removeMutation(id: string): Promise<void> {
  await remove(STORES.MUTATION_QUEUE, id);
  await updatePendingCount();
}

async function updateMutationRetry(id: string, error: string): Promise<void> {
  const mutation = await getById<PendingMutation>(STORES.MUTATION_QUEUE, id);
  if (mutation) {
    mutation.retryCount++;
    mutation.lastError = error;
    await put(STORES.MUTATION_QUEUE, mutation);
  }
}

async function updatePendingCount(): Promise<void> {
  const mutations = await getAll<PendingMutation>(STORES.MUTATION_QUEUE);
  await setSyncMeta('pendingCount', mutations.length);
}

// ============================================
// SYNC METADATA
// ============================================

async function getSyncMeta(key: string): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_META, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_META);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
}

async function setSyncMeta(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_META, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_META);
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getLastSyncTime(): Promise<number> {
  return (await getSyncMeta('lastSyncTime')) || 0;
}

async function setLastSyncTime(time: number): Promise<void> {
  await setSyncMeta('lastSyncTime', time);
}

// ============================================
// ENTITY-SPECIFIC SERVICES
// ============================================

export const offlineQuotesService = {
  getAll: () => getAll(STORES.QUOTES),
  getById: (id: string) => getById(STORES.QUOTES, id),
  save: async (quote: any, isOnline: boolean) => {
    await put(STORES.QUOTES, quote);
    if (!isOnline) {
      await addToMutationQueue({
        type: quote._isNew ? 'create' : 'update',
        storeName: STORES.QUOTES,
        entityId: quote.id,
        data: quote,
      });
    }
  },
  delete: async (id: string, isOnline: boolean) => {
    await remove(STORES.QUOTES, id);
    if (!isOnline) {
      await addToMutationQueue({
        type: 'delete',
        storeName: STORES.QUOTES,
        entityId: id,
        data: null,
      });
    }
  },
  sync: (quotes: any[]) => bulkPut(STORES.QUOTES, quotes),
  clear: () => clearStore(STORES.QUOTES),
};

export const offlineCustomersService = {
  getAll: () => getAll(STORES.CUSTOMERS),
  getById: (id: string) => getById(STORES.CUSTOMERS, id),
  save: async (customer: any, isOnline: boolean) => {
    await put(STORES.CUSTOMERS, customer);
    if (!isOnline) {
      await addToMutationQueue({
        type: customer._isNew ? 'create' : 'update',
        storeName: STORES.CUSTOMERS,
        entityId: customer.id,
        data: customer,
      });
    }
  },
  delete: async (id: string, isOnline: boolean) => {
    await remove(STORES.CUSTOMERS, id);
    if (!isOnline) {
      await addToMutationQueue({
        type: 'delete',
        storeName: STORES.CUSTOMERS,
        entityId: id,
        data: null,
      });
    }
  },
  sync: (customers: any[]) => bulkPut(STORES.CUSTOMERS, customers),
  clear: () => clearStore(STORES.CUSTOMERS),
};

export const offlineScheduleService = {
  getAll: () => getAll(STORES.SCHEDULE),
  getById: (id: string) => getById(STORES.SCHEDULE, id),
  save: async (entry: any, isOnline: boolean) => {
    await put(STORES.SCHEDULE, entry);
    if (!isOnline) {
      await addToMutationQueue({
        type: entry._isNew ? 'create' : 'update',
        storeName: STORES.SCHEDULE,
        entityId: entry.id,
        data: entry,
      });
    }
  },
  delete: async (id: string, isOnline: boolean) => {
    await remove(STORES.SCHEDULE, id);
    if (!isOnline) {
      await addToMutationQueue({
        type: 'delete',
        storeName: STORES.SCHEDULE,
        entityId: id,
        data: null,
      });
    }
  },
  sync: (entries: any[]) => bulkPut(STORES.SCHEDULE, entries),
  clear: () => clearStore(STORES.SCHEDULE),
};

export const offlineJobPacksService = {
  getAll: () => getAll(STORES.JOB_PACKS),
  getById: (id: string) => getById(STORES.JOB_PACKS, id),
  save: async (jobPack: any, isOnline: boolean) => {
    await put(STORES.JOB_PACKS, jobPack);
    if (!isOnline) {
      await addToMutationQueue({
        type: jobPack._isNew ? 'create' : 'update',
        storeName: STORES.JOB_PACKS,
        entityId: jobPack.id,
        data: jobPack,
      });
    }
  },
  delete: async (id: string, isOnline: boolean) => {
    await remove(STORES.JOB_PACKS, id);
    if (!isOnline) {
      await addToMutationQueue({
        type: 'delete',
        storeName: STORES.JOB_PACKS,
        entityId: id,
        data: null,
      });
    }
  },
  sync: (jobPacks: any[]) => bulkPut(STORES.JOB_PACKS, jobPacks),
  clear: () => clearStore(STORES.JOB_PACKS),
};

export const offlineExpensesService = {
  getAll: () => getAll(STORES.EXPENSES),
  getById: (id: string) => getById(STORES.EXPENSES, id),
  save: async (expense: any, isOnline: boolean) => {
    await put(STORES.EXPENSES, expense);
    if (!isOnline) {
      await addToMutationQueue({
        type: expense._isNew ? 'create' : 'update',
        storeName: STORES.EXPENSES,
        entityId: expense.id,
        data: expense,
      });
    }
  },
  delete: async (id: string, isOnline: boolean) => {
    await remove(STORES.EXPENSES, id);
    if (!isOnline) {
      await addToMutationQueue({
        type: 'delete',
        storeName: STORES.EXPENSES,
        entityId: id,
        data: null,
      });
    }
  },
  sync: (expenses: any[]) => bulkPut(STORES.EXPENSES, expenses),
  clear: () => clearStore(STORES.EXPENSES),
};

// ============================================
// MAIN OFFLINE SERVICE
// ============================================

export const offlineService = {
  // Mutation queue
  getPendingMutations,
  removeMutation,
  updateMutationRetry,
  getPendingCount: async () => (await getSyncMeta('pendingCount')) || 0,

  // Sync metadata
  getLastSyncTime,
  setLastSyncTime,
  setSyncMeta,
  getSyncMeta,

  // Entity services
  quotes: offlineQuotesService,
  customers: offlineCustomersService,
  schedule: offlineScheduleService,
  jobPacks: offlineJobPacksService,
  expenses: offlineExpensesService,

  // Clear all offline data
  clearAll: async () => {
    await clearStore(STORES.QUOTES);
    await clearStore(STORES.CUSTOMERS);
    await clearStore(STORES.SCHEDULE);
    await clearStore(STORES.JOB_PACKS);
    await clearStore(STORES.EXPENSES);
    await clearStore(STORES.MUTATION_QUEUE);
  },

  // Check if DB is available
  isAvailable: async (): Promise<boolean> => {
    try {
      await openDB();
      return true;
    } catch {
      return false;
    }
  },
};

export default offlineService;
