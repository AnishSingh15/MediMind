/**
 * Zustand store for dose logs
 * Persisted to AsyncStorage for offline-first access
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { create } from 'zustand';
import { DoseLogData } from '../services/firebase';

const STORAGE_KEY = '@medimind_logs';

export interface DoseLog extends DoseLogData {
    id: string;
}

interface LogStore {
    todayLogs: DoseLog[];
    loading: boolean;

    // Actions
    loadTodayLogs: () => Promise<void>;
    loadLogsByDate: (dateKey: string) => Promise<DoseLog[]>;
    logDose: (log: DoseLog) => Promise<void>;
    getLogForMedicineTime: (medicineId: string, scheduledTime: string) => DoseLog | undefined;
    isTimeTaken: (medicineId: string, scheduledTime: string) => boolean;
}

export const useLogStore = create<LogStore>((set, get) => ({
    todayLogs: [],
    loading: true,

    loadTodayLogs: async () => {
        try {
            set({ loading: true });
            const today = format(new Date(), 'yyyy-MM-dd');
            const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${today}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                const logs = parsed.map((l: any) => ({
                    ...l,
                    takenAt: l.takenAt ? new Date(l.takenAt) : null,
                }));
                set({ todayLogs: logs, loading: false });
            } else {
                set({ todayLogs: [], loading: false });
            }
        } catch (e) {
            console.warn('Failed to load today logs:', e);
            set({ todayLogs: [], loading: false });
        }
    },

    loadLogsByDate: async (dateKey: string) => {
        try {
            const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${dateKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.map((l: any) => ({
                    ...l,
                    takenAt: l.takenAt ? new Date(l.takenAt) : null,
                }));
            }
            return [];
        } catch (e) {
            console.warn('Failed to load logs for date:', e);
            return [];
        }
    },

    logDose: async (log: DoseLog) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const existingIndex = get().todayLogs.findIndex(
            (l) =>
                l.medicineId === log.medicineId &&
                l.scheduledTime === log.scheduledTime &&
                l.scheduledDate === log.scheduledDate
        );

        let todayLogs: DoseLog[];
        if (existingIndex >= 0) {
            // Update existing log
            todayLogs = [...get().todayLogs];
            todayLogs[existingIndex] = log;
        } else {
            // Add new log
            todayLogs = [...get().todayLogs, log];
        }

        set({ todayLogs });
        await persistTodayLogs(today, todayLogs);
    },

    getLogForMedicineTime: (medicineId: string, scheduledTime: string) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().todayLogs.find(
            (l) =>
                l.medicineId === medicineId &&
                l.scheduledTime === scheduledTime &&
                l.scheduledDate === today
        );
    },

    isTimeTaken: (medicineId: string, scheduledTime: string) => {
        const log = get().getLogForMedicineTime(medicineId, scheduledTime);
        return log !== undefined && (log.takenAt !== null || log.skipped);
    },
}));

async function persistTodayLogs(date: string, logs: DoseLog[]) {
    try {
        await AsyncStorage.setItem(`${STORAGE_KEY}_${date}`, JSON.stringify(logs));
    } catch (e) {
        console.warn('Failed to persist logs:', e);
    }
}
