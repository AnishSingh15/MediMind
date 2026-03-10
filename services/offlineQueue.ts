/**
 * Offline queue service
 * Queues Firestore writes when offline, flushes on reconnect
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import {
    addMedicine,
    deleteMedicine,
    DoseLogData,
    logDose,
    MedicineData,
    updateMedicine,
} from './firebase';

const QUEUE_KEY = '@medimind_offline_queue';

export interface QueuedAction {
    id: string;
    type: 'addMedicine' | 'updateMedicine' | 'deleteMedicine' | 'logDose';
    userId: string;
    data: any;
    timestamp: number;
}

let unsubscribeNetInfo: NetInfoSubscription | null = null;

// ─── Queue Operations ────────────────────────────────────────

export async function enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
    const queue = await getQueue();
    queue.push({
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAction[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function clearQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

export async function removeFromQueue(actionId: string) {
    const queue = await getQueue();
    const filtered = queue.filter((a) => a.id !== actionId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

// ─── Flush Queue to Firestore ────────────────────────────────

export async function flushQueue(): Promise<number> {
    const queue = await getQueue();
    if (queue.length === 0) return 0;

    let flushed = 0;

    for (const action of queue) {
        try {
            switch (action.type) {
                case 'addMedicine':
                    await addMedicine(action.userId, action.data as MedicineData);
                    break;
                case 'updateMedicine':
                    await updateMedicine(action.userId, action.data.medicineId, action.data.updates);
                    break;
                case 'deleteMedicine':
                    await deleteMedicine(action.userId, action.data.medicineId);
                    break;
                case 'logDose':
                    await logDose(action.userId, action.data as DoseLogData);
                    break;
            }
            await removeFromQueue(action.id);
            flushed++;
        } catch (e) {
            console.warn(`Failed to flush action ${action.type}:`, e);
            // Keep in queue for next attempt
        }
    }

    return flushed;
}

// ─── Auto-sync on Reconnect ─────────────────────────────────

export function startOfflineQueueSync() {
    if (unsubscribeNetInfo) return; // Already watching

    unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
        if (state.isConnected && state.isInternetReachable) {
            const flushed = await flushQueue();
            if (flushed > 0) {
                console.log(`📡 Synced ${flushed} offline actions to Firebase`);
            }
        }
    });
}

export function stopOfflineQueueSync() {
    if (unsubscribeNetInfo) {
        unsubscribeNetInfo();
        unsubscribeNetInfo = null;
    }
}
