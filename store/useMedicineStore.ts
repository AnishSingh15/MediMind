/**
 * Zustand store for medicines
 * Persisted to AsyncStorage for offline-first access
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MedicineData } from '../services/firebase';

const STORAGE_KEY = '@medimind_medicines';

export interface Medicine extends MedicineData {
    id: string;
}

interface MedicineStore {
    medicines: Medicine[];
    loading: boolean;

    // Actions
    loadMedicines: () => Promise<void>;
    addMedicine: (medicine: Medicine) => Promise<void>;
    updateMedicine: (id: string, updates: Partial<MedicineData>) => Promise<void>;
    deleteMedicine: (id: string) => Promise<void>;
    updateNotifIds: (id: string, notifIds: string[]) => Promise<void>;
    getMedicineById: (id: string) => Medicine | undefined;
}

export const useMedicineStore = create<MedicineStore>((set, get) => ({
    medicines: [],
    loading: true,

    loadMedicines: async () => {
        try {
            set({ loading: true });
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Restore Date objects
                const medicines = parsed.map((m: any) => ({
                    ...m,
                    startDate: new Date(m.startDate),
                }));
                set({ medicines, loading: false });
            } else {
                set({ medicines: [], loading: false });
            }
        } catch (e) {
            console.warn('Failed to load medicines:', e);
            set({ medicines: [], loading: false });
        }
    },

    addMedicine: async (medicine: Medicine) => {
        const medicines = [...get().medicines, medicine];
        set({ medicines });
        await persistMedicines(medicines);
    },

    updateMedicine: async (id: string, updates: Partial<MedicineData>) => {
        const medicines = get().medicines.map((m) =>
            m.id === id ? { ...m, ...updates } : m
        );
        set({ medicines });
        await persistMedicines(medicines);
    },

    deleteMedicine: async (id: string) => {
        const medicines = get().medicines.filter((m) => m.id !== id);
        set({ medicines });
        await persistMedicines(medicines);
    },

    updateNotifIds: async (id: string, notifIds: string[]) => {
        const medicines = get().medicines.map((m) =>
            m.id === id ? { ...m, notifIds } : m
        );
        set({ medicines });
        await persistMedicines(medicines);
    },

    getMedicineById: (id: string) => {
        return get().medicines.find((m) => m.id === id);
    },
}));

async function persistMedicines(medicines: Medicine[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    } catch (e) {
        console.warn('Failed to persist medicines:', e);
    }
}
