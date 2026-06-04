/**
 * IndexedDB wrapper for offline inbound storage.
 * Uses Dexie.js to persist pending inbound form data when the user is offline.
 * Data is automatically synced to the backend when the connection is restored.
 *
 * @author StockOps Team
 * @since 1.0
 * @see useOfflineInbound
 */

import Dexie, { type Table } from 'dexie'

/**
 * Pending inbound record stored in IndexedDB.
 */
export interface PendingInbound {
  /** Auto-incremented primary key. */
  id?: number
  /** Product barcode scanned or entered manually. */
  productBarcode: string
  /** Quantity of the inbound item. */
  quantity: number
  /** LOT number for traceability. */
  lotNumber: string
  /** Expiry date (ISO string, optional). */
  expiryDate?: string
  /** Target location ID. */
  locationId: number
  /** Target warehouse ID. */
  warehouseId: number
  /** Target center ID. */
  centerId: number
  /** Timestamp when the record was created locally. */
  createdAt: string
  /** Sync status flag (0 = pending, 1 = synced). */
  synced: 0 | 1
}

/**
 * Dexie database for StockOps offline storage.
 */
class StockOpsOfflineDB extends Dexie {
  /** Table for pending inbound items waiting to be synced. */
  pendingInbounds!: Table<PendingInbound, number>

  constructor() {
    super('stockops-offline')
    this.version(1).stores({
      pendingInbounds: '++id, productBarcode, locationId, warehouseId, centerId, createdAt, synced',
    })
  }
}

/** Singleton instance of the offline database. */
const db = new StockOpsOfflineDB()

/**
 * Saves an inbound item to IndexedDB for later sync.
 *
 * @param data - Partial pending inbound data (id and createdAt are auto-filled)
 * @returns The saved record with its generated id
 * @example
 * const saved = await saveInbound({
 *   productBarcode: '8801234567890',
 *   quantity: 100,
 *   lotNumber: 'LOT001',
 *   locationId: 1,
 *   warehouseId: 2,
 *   centerId: 3,
 * })
 */
export async function saveInbound(
  data: Omit<PendingInbound, 'id' | 'createdAt' | 'synced'>
): Promise<PendingInbound> {
  const record: PendingInbound = {
    ...data,
    createdAt: new Date().toISOString(),
    synced: 0,
  }
  const id = await db.pendingInbounds.add(record)
  return { ...record, id }
}

/**
 * Retrieves all unsynced pending inbound records.
 *
 * @returns Array of pending inbound items ordered by creation time (oldest first)
 * @example
 * const pending = await getPendingInbounds()
 */
export async function getPendingInbounds(): Promise<PendingInbound[]> {
  return db.pendingInbounds.where('synced').equals(0).sortBy('createdAt')
}

/**
 * Removes a pending inbound record by its id (after successful sync).
 *
 * @param id - The auto-generated id of the pending record
 * @example
 * await removeInbound(42)
 */
export async function removeInbound(id: number): Promise<void> {
  await db.pendingInbounds.delete(id)
}

/**
 * Returns the count of unsynced pending inbound records.
 *
 * @returns Number of pending items awaiting sync
 * @example
 * const count = await countPending()
 */
export async function countPending(): Promise<number> {
  return db.pendingInbounds.where('synced').equals(0).count()
}

/**
 * Clears all synced records (housekeeping).
 * This is a convenience method for maintenance.
 *
 * @returns Number of records removed
 */
export async function clearSynced(): Promise<number> {
  const ids = await db.pendingInbounds.where('synced').equals(1).primaryKeys()
  await db.pendingInbounds.bulkDelete(ids)
  return ids.length
}
