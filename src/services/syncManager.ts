/**
 * Sync Manager
 *
 * Handles background synchronization of offline mutations when connectivity returns.
 * Provides hooks and context for offline-aware operations.
 */

import { offlineService, PendingMutation } from './offlineStorage';
import {
  customersService,
  quotesService,
  jobPacksService,
  scheduleService,
  expensesService,
} from './dataService';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncState {
  isOnline: boolean;
  status: SyncStatus;
  pendingCount: number;
  lastSyncTime: number;
  currentlySyncing: string | null;
  errors: string[];
}

type SyncListener = (state: SyncState) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    status: 'idle',
    pendingCount: 0,
    lastSyncTime: 0,
    currentlySyncing: null,
    errors: [],
  };
  private syncInProgress = false;
  private syncRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.initState();
    }
  }

  private async initState() {
    const lastSyncTime = await offlineService.getLastSyncTime();
    const pendingCount = await offlineService.getPendingCount();
    this.updateState({ lastSyncTime, pendingCount });
  }

  private handleOnline = () => {
    this.updateState({ isOnline: true });
    this.syncPendingMutations();
  };

  private handleOffline = () => {
    this.updateState({ isOnline: false, status: 'idle' });
    if (this.syncRetryTimeout) {
      clearTimeout(this.syncRetryTimeout);
      this.syncRetryTimeout = null;
    }
  };

  private updateState(updates: Partial<SyncState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): SyncState {
    return this.state;
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Process pending mutations
   */
  async syncPendingMutations(): Promise<void> {
    if (this.syncInProgress || !this.state.isOnline) return;

    this.syncInProgress = true;
    this.updateState({ status: 'syncing', errors: [] });

    try {
      const mutations = await offlineService.getPendingMutations();

      if (mutations.length === 0) {
        this.updateState({ status: 'success', pendingCount: 0 });
        await offlineService.setLastSyncTime(Date.now());
        this.syncInProgress = false;
        return;
      }

      const errors: string[] = [];
      let successCount = 0;

      for (const mutation of mutations) {
        if (!this.state.isOnline) break;

        this.updateState({ currentlySyncing: mutation.entityId });

        try {
          await this.processMutation(mutation);
          await offlineService.removeMutation(mutation.id);
          successCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${mutation.storeName}/${mutation.entityId}: ${errorMessage}`);

          // Update retry count
          await offlineService.updateMutationRetry(mutation.id, errorMessage);

          // If too many retries, skip this mutation (will be handled manually)
          if (mutation.retryCount >= 3) {
            console.error(`Mutation ${mutation.id} failed after 3 retries, skipping`);
          }
        }
      }

      const remainingCount = await offlineService.getPendingCount();
      await offlineService.setLastSyncTime(Date.now());

      this.updateState({
        status: errors.length > 0 ? 'error' : 'success',
        pendingCount: remainingCount,
        lastSyncTime: Date.now(),
        currentlySyncing: null,
        errors,
      });

      // If there are still pending mutations, retry after a delay
      if (remainingCount > 0 && this.state.isOnline) {
        this.syncRetryTimeout = setTimeout(() => {
          this.syncRetryTimeout = null;
          this.syncPendingMutations();
        }, 30000); // Retry in 30 seconds
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateState({
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        currentlySyncing: null,
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processMutation(mutation: PendingMutation): Promise<void> {
    const { type, storeName, entityId, data } = mutation;

    switch (storeName) {
      case 'customers':
        await this.syncCustomer(type, entityId, data);
        break;
      case 'quotes':
        await this.syncQuote(type, entityId, data);
        break;
      case 'job_packs':
        await this.syncJobPack(type, entityId, data);
        break;
      case 'schedule':
        await this.syncScheduleEntry(type, entityId, data);
        break;
      case 'expenses':
        await this.syncExpense(type, entityId, data);
        break;
      default:
        throw new Error(`Unknown store: ${storeName}`);
    }
  }

  private async syncCustomer(type: string, id: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await customersService.create({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          company: data.company || null,
          user_id: data.userId,
        });
        break;
      case 'update':
        await customersService.update(id, {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          company: data.company || null,
        });
        break;
      case 'delete':
        await customersService.delete(id);
        break;
    }
  }

  private async syncQuote(type: string, id: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await quotesService.create({
          user_id: data.userId,
          customer_id: data.customerId || null,
          job_pack_id: data.projectId || null,
          title: data.title,
          type: data.type,
          status: data.status,
          sections: data.sections,
          labour_rate: data.labourRate,
          markup_percent: data.markupPercent,
          tax_percent: data.taxPercent,
          cis_percent: data.cisPercent,
          notes: data.notes || null,
          display_options: data.displayOptions,
        });
        break;
      case 'update':
        await quotesService.update(id, {
          customer_id: data.customerId || null,
          job_pack_id: data.projectId || null,
          title: data.title,
          type: data.type,
          status: data.status,
          sections: data.sections,
          labour_rate: data.labourRate,
          markup_percent: data.markupPercent,
          tax_percent: data.taxPercent,
          cis_percent: data.cisPercent,
          notes: data.notes || null,
          display_options: data.displayOptions,
        });
        break;
      case 'delete':
        await quotesService.delete(id);
        break;
    }
  }

  private async syncJobPack(type: string, id: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await jobPacksService.create({
          user_id: data.userId,
          customer_id: data.customerId || null,
          title: data.title,
          status: data.status,
          notepad: data.notepad || null,
        });
        break;
      case 'update':
        await jobPacksService.update(id, {
          customer_id: data.customerId || null,
          title: data.title,
          status: data.status,
          notepad: data.notepad || null,
        });
        break;
      case 'delete':
        await jobPacksService.delete(id);
        break;
    }
  }

  private async syncScheduleEntry(type: string, id: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await scheduleService.create({
          user_id: data.userId,
          job_pack_id: data.projectId || null,
          customer_id: data.customerId || null,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_time: data.start,
          end_time: data.end,
        });
        break;
      case 'update':
        await scheduleService.update(id, {
          job_pack_id: data.projectId || null,
          customer_id: data.customerId || null,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          start_time: data.start,
          end_time: data.end,
        });
        break;
      case 'delete':
        await scheduleService.delete(id);
        break;
    }
  }

  private async syncExpense(type: string, id: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await expensesService.create({
          job_pack_id: data.jobPackId || null,
          vendor: data.vendor,
          description: data.description || null,
          amount: data.amount,
          vat_amount: data.vatAmount || 0,
          category: data.category,
          expense_date: data.expenseDate,
          payment_method: data.paymentMethod,
        });
        break;
      case 'update':
        await expensesService.update(id, {
          job_pack_id: data.jobPackId || null,
          vendor: data.vendor,
          description: data.description || null,
          amount: data.amount,
          vat_amount: data.vatAmount || 0,
          category: data.category,
          expense_date: data.expenseDate,
          payment_method: data.paymentMethod,
        });
        break;
      case 'delete':
        await expensesService.delete(id);
        break;
    }
  }

  /**
   * Sync fresh data from server to local IndexedDB
   */
  async pullFromServer(data: {
    customers?: any[];
    quotes?: any[];
    jobPacks?: any[];
    schedule?: any[];
    expenses?: any[];
  }): Promise<void> {
    if (data.customers) {
      await offlineService.customers.sync(data.customers);
    }
    if (data.quotes) {
      await offlineService.quotes.sync(data.quotes);
    }
    if (data.jobPacks) {
      await offlineService.jobPacks.sync(data.jobPacks);
    }
    if (data.schedule) {
      await offlineService.schedule.sync(data.schedule);
    }
    if (data.expenses) {
      await offlineService.expenses.sync(data.expenses);
    }
    await offlineService.setLastSyncTime(Date.now());
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    await this.syncPendingMutations();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.syncRetryTimeout) {
      clearTimeout(this.syncRetryTimeout);
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const syncManager = new SyncManager();

export default syncManager;
