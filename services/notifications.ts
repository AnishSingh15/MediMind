/**
 * Notification Service
 * expo-notifications: schedule/cancel/reschedule local notifications
 * Fully offline — fires on-device via OS alarm system
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

const STORAGE_KEY = "@medimind_notif_ids";

// Configure notification appearance
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ───────────────────────────────────────────────────

interface MedicineForNotif {
  id: string;
  name: string;
  times: string[]; // ['08:00', '21:00']
  frequency: string;
  customDays?: number[];
  active?: boolean;
}

// ─── Permission Request ──────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Notifications Required",
      "MediMind needs notifications to remind you about your medicines. Please enable them in Settings.",
      [{ text: "OK" }],
    );
    return false;
  }

  // Android: request exact alarm permission for API 31+
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medicine-reminders", {
      name: "Medicine Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: "#7C3AED",
    });
  }

  return true;
}

// ─── Expo Push Token Registration ────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  try {
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("No EAS project ID configured for push notifications");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    // Store locally
    await AsyncStorage.setItem("@medimind_pushToken", pushToken);

    // Store in Firestore (for potential server-side push later)
    try {
      const userId = await AsyncStorage.getItem("@medimind_userId");
      if (userId) {
        const { getDb } = await import("./firebase");
        const { doc, setDoc } = await import("firebase/firestore");
        const db = getDb();
        await setDoc(
          doc(db, "users", userId),
          {
            pushToken,
            tokenUpdatedAt: new Date(),
            platform: Platform.OS,
          },
          { merge: true },
        );
      }
    } catch (e) {
      console.warn("Failed to save push token to Firestore:", e);
    }

    console.log("📱 Expo push token:", pushToken);
    return pushToken;
  } catch (e) {
    console.warn("Failed to get push token:", e);
    return null;
  }
}

export async function scheduleMedicineNotifications(
  medicine: MedicineForNotif,
): Promise<string[]> {
  if (Platform.OS === "web") return [];

  const notifIds: string[] = [];

  // Determine which weekdays to schedule for
  // weekly  => single day from customDays
  // custom  => one notification per selected day per time
  // daily   => one DAILY trigger per time
  // weekdays => Mon-Fri DAILY (OS can't filter; we schedule all 5 separately using WEEKLY)
  const daysToSchedule: number[] = (() => {
    if (medicine.frequency === "weekly" || medicine.frequency === "custom") {
      return medicine.customDays ?? [];
    }
    if (medicine.frequency === "weekdays") {
      return [1, 2, 3, 4, 5]; // Mon-Fri (JS 0-indexed)
    }
    return []; // empty = use DAILY trigger
  })();

  for (const timeStr of medicine.times) {
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (daysToSchedule.length > 0) {
      // Schedule one WEEKLY trigger per day
      for (const jsDay of daysToSchedule) {
        // expo-notifications weekday: 1=Sunday … 7=Saturday
        const expoWeekday = (jsDay % 7) + 1;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "💊 Medicine Reminder",
            body: `Time to take ${medicine.name}`,
            data: {
              medicineId: medicine.id,
              medicineName: medicine.name,
              scheduledTime: timeStr,
            },
            priority: Notifications.AndroidNotificationPriority.MAX,
            color: "#7C3AED",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: expoWeekday,
            hour: hours,
            minute: minutes,
          } as any,
        });
        notifIds.push(id);
      }
    } else {
      // Daily trigger (for 'daily' frequency)
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Medicine Reminder",
          body: `Time to take ${medicine.name}`,
          data: {
            medicineId: medicine.id,
            medicineName: medicine.name,
            scheduledTime: timeStr,
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: "#7C3AED",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
      notifIds.push(id);
    }
  }

  // Store notification IDs in AsyncStorage for resilience
  await saveNotifIds(medicine.id, notifIds);
  return notifIds;
}

export async function testNotification(): Promise<void> {
  if (Platform.OS === "web") {
    alert("Test Reminder: Notifications are working (Web fallback)");
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Test Reminder",
      body: "Notifications are working perfectly!",
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: "#7C3AED",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}

// ─── Cancel Notifications ────────────────────────────────────

export async function cancelMedicineNotifications(
  notifIds: string[],
): Promise<void> {
  if (Platform.OS === "web") return;
  for (const id of notifIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // Notification may have already been delivered/cleared
      console.warn("Could not cancel notification:", id);
    }
  }
}

// ─── Reschedule on App Boot ──────────────────────────────────

export async function rescheduleAllIfMissing(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((n) => n.identifier));

    // Get stored medicines from AsyncStorage
    const storedMedsStr = await AsyncStorage.getItem("@medimind_medicines");
    if (!storedMedsStr) return;

    const medicines: (MedicineForNotif & { notifIds: string[] })[] =
      JSON.parse(storedMedsStr);

    for (const med of medicines) {
      if (!med.active) continue;

      // Check if any notification for this medicine is missing
      const allPresent = med.notifIds?.every((id) => scheduledIds.has(id));

      if (!allPresent) {
        // Cancel any remaining and reschedule all
        if (med.notifIds) {
          await cancelMedicineNotifications(med.notifIds);
        }
        const newIds = await scheduleMedicineNotifications(med);
        // Update stored IDs
        med.notifIds = newIds;
      }
    }

    // Save updated IDs back
    await AsyncStorage.setItem(
      "@medimind_medicines",
      JSON.stringify(medicines),
    );
  } catch (e) {
    console.warn("Reschedule check failed:", e);
  }
}

// ─── Battery Optimization Guide ──────────────────────────────

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
    } catch (e) {
      // Fallback: open general battery settings
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.BATTERY_SAVER_SETTINGS,
        );
      } catch {
        Alert.alert(
          "Battery Settings",
          "Please go to Settings → Battery → Battery Optimization → MediMind → Don't Optimize",
          [{ text: "OK" }],
        );
      }
    }
  }
}

export function showBatteryOptimizationGuide(): void {
  Alert.alert(
    "🔋 Keep Reminders Working",
    'To make sure medicine reminders always arrive on time, please disable battery optimization for MediMind.\n\nTap "Open Settings" and find MediMind → select "Don\'t Optimize".',
    [
      { text: "Later", style: "cancel" },
      { text: "Open Settings", onPress: openBatteryOptimizationSettings },
    ],
  );
}

// ─── Storage Helpers ─────────────────────────────────────────

async function saveNotifIds(medicineId: string, notifIds: string[]) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const map = existing ? JSON.parse(existing) : {};
    map[medicineId] = notifIds;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save notification IDs:", e);
  }
}

export async function getStoredNotifIds(medicineId: string): Promise<string[]> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return [];
    const map = JSON.parse(existing);
    return map[medicineId] || [];
  } catch {
    return [];
  }
}

// ─── Notification Response Listener ──────────────────────────

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}
