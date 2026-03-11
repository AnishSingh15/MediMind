/**
 * Zustand store for medicines
 * Persisted to AsyncStorage for offline-first access
 * Syncs from Firestore on login (so reinstalls restore data)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { getMedicines, MedicineData } from "../services/firebase";
import { scheduleMedicineNotifications } from "../services/notifications";

const STORAGE_KEY = "@medimind_medicines";

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
  replaceMedicineId: (oldId: string, newId: string) => Promise<void>;
  getMedicineById: (id: string) => Medicine | undefined;
}

export const useMedicineStore = create<MedicineStore>((set, get) => ({
  medicines: [],
  loading: true,

  loadMedicines: async () => {
    try {
      set({ loading: true });

      // 1. Load from AsyncStorage first (instant, offline-first)
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let medicines: Medicine[] = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        medicines = parsed.map((m: any) => ({
          ...m,
          startDate: new Date(m.startDate),
        }));
        set({ medicines, loading: false });
      }

      // 2. Try to sync from Firestore (handles reinstall / new device)
      try {
        const userId = await AsyncStorage.getItem("@medimind_userId");
        if (userId) {
          const cloudMeds = await getMedicines(userId);
          if (cloudMeds.length > 0) {
            // Merge: use cloud data as source of truth,
            // but keep local-only medicines (not yet synced)
            const cloudIds = new Set(cloudMeds.map((m) => m.id));
            const localOnly = medicines.filter(
              (m) => m.id.startsWith("local_") && !cloudIds.has(m.id),
            );
            const merged = [
              ...cloudMeds.map((m) => ({ ...m, notifIds: [] as string[] })),
              ...localOnly,
            ];
            set({ medicines: merged, loading: false });
            await persistMedicines(merged);

            // Reschedule notifications for all active medicines
            // (critical after reinstall — local notifications are wiped)
            for (const med of merged) {
              if (med.active && med.times?.length > 0) {
                try {
                  const notifIds = await scheduleMedicineNotifications({
                    id: med.id,
                    name: med.name,
                    times: med.times,
                    frequency: med.frequency,
                    customDays: med.customDays,
                  });
                  med.notifIds = notifIds;
                } catch (e) {
                  console.warn(
                    "Failed to reschedule notifications for",
                    med.name,
                    e,
                  );
                }
              }
            }
            // Persist updated notification IDs
            await persistMedicines(merged);
          } else if (medicines.length === 0) {
            set({ medicines: [], loading: false });
          }
        }
      } catch (e) {
        // Firestore unavailable (offline) — local data is fine
        console.warn("Firestore sync skipped:", e);
      }

      set({ loading: false });
    } catch (e) {
      console.warn("Failed to load medicines:", e);
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
      m.id === id ? { ...m, ...updates } : m,
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
      m.id === id ? { ...m, notifIds } : m,
    );
    set({ medicines });
    await persistMedicines(medicines);
  },

  replaceMedicineId: async (oldId: string, newId: string) => {
    const medicines = get().medicines.map((m) =>
      m.id === oldId ? { ...m, id: newId } : m,
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
    console.warn("Failed to persist medicines:", e);
  }
}
