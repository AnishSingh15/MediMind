import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import MedicineCard from "../../components/MedicineCard";
import {
    BorderRadius,
    Colors,
    Elevation,
    Spacing,
    TouchTarget,
} from "../../constants/theme";
import {
    rescheduleAllIfMissing,
    showBatteryOptimizationGuide,
} from "../../services/notifications";
import { useLogStore } from "../../store/useLogStore";
import { useMedicineStore } from "../../store/useMedicineStore";

export default function HomeScreen() {
  const router = useRouter();
  const medicines = useMedicineStore((s) => s.medicines);
  const loadMedicines = useMedicineStore((s) => s.loadMedicines);
  const todayLogs = useLogStore((s) => s.todayLogs);
  const loadTodayLogs = useLogStore((s) => s.loadTodayLogs);
  const isTimeTaken = useLogStore((s) => s.isTimeTaken);

  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [greeting, setGreeting] = useState("Good Morning");
  const [userName, setUserName] = useState("");

  // Determine greeting based on time of day + load user name
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    // Load user's display name
    AsyncStorage.getItem("@medimind_userName").then((name) => {
      if (name) setUserName(name.split(" ")[0]); // First name only
    });
  }, []);

  // Reschedule notifications if needed on mount
  useEffect(() => {
    rescheduleAllIfMissing();

    // Check if battery optimization guide should be shown (first launch)
    async function checkBatteryGuide() {
      const shown = await AsyncStorage.getItem("@medimind_battery_guide_shown");
      if (!shown) {
        setTimeout(() => {
          showBatteryOptimizationGuide();
          AsyncStorage.setItem("@medimind_battery_guide_shown", "true");
        }, 2000);
      }
    }
    checkBatteryGuide();
  }, []);

  // Build today's schedule from medicines
  const activeMedicines = useMemo(() => {
    return medicines.filter((m) => m.active);
  }, [medicines]);

  interface ScheduleItem {
    medicineId: string;
    medicineName: string;
    time: string;
    color: string;
    isTaken: boolean;
    isSkipped: boolean;
  }

  const todaySchedule = useMemo(() => {
    const items: ScheduleItem[] = [];
    const today = format(new Date(), "yyyy-MM-dd");

    for (const med of activeMedicines) {
      // Check if medicine should be shown today based on frequency
      const dayOfWeek = new Date().getDay();
      if (
        med.frequency === "weekdays" &&
        (dayOfWeek === 0 || dayOfWeek === 6)
      ) {
        continue;
      }
      if (
        (med.frequency === "custom" || med.frequency === "weekly") &&
        !med.customDays.includes(dayOfWeek)
      ) {
        continue;
      }

      for (const time of med.times) {
        const log = todayLogs.find(
          (l) =>
            l.medicineId === med.id &&
            l.scheduledTime === time &&
            l.scheduledDate === today,
        );
        items.push({
          medicineId: med.id,
          medicineName: med.name,
          time,
          color: med.color,
          isTaken: log ? log.takenAt !== null : false,
          isSkipped: log ? log.skipped : false,
        });
      }
    }

    // Sort by time
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [activeMedicines, todayLogs]);

  const upcoming = todaySchedule.filter(
    (item) => !item.isTaken && !item.isSkipped,
  );
  const completed = todaySchedule.filter(
    (item) => item.isTaken || item.isSkipped,
  );
  const totalDoses = todaySchedule.length;
  const takenDoses = todaySchedule.filter((item) => item.isTaken).length;
  const progress = totalDoses > 0 ? takenDoses / totalDoses : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMedicines();
    await loadTodayLogs();
    setRefreshing(false);
  }, []);

  const handleMarkTaken = (item: ScheduleItem) => {
    router.push({
      pathname: "/log-dose",
      params: {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        scheduledTime: item.time,
      },
    });
  };

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting}
            {userName ? `, ${userName}` : ""}! 💊
          </Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {/* Progress Section */}
        {totalDoses > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {takenDoses} of {totalDoses} medicines taken today
              </Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Empty State */}
        {medicines.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="pill"
              size={80}
              color={Colors.primaryLight}
            />
            <Text style={styles.emptyTitle}>No medicines added yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to add your first medicine reminder
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => router.push("/medicine/add")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={Colors.textOnPrimary}
              />
              <Text style={styles.emptyAddText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={22}
                color={Colors.primary}
              />
              {"  "}Upcoming
            </Text>
            {upcoming.map((item, idx) => (
              <MedicineCard
                key={`${item.medicineId}_${item.time}_${idx}`}
                name={item.medicineName}
                time={item.time}
                color={item.color}
                isTaken={false}
                isSkipped={false}
                onMarkTaken={() => handleMarkTaken(item)}
              />
            ))}
          </View>
        )}

        {/* Completed Section */}
        {completed.length > 0 && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.completedHeader}
              onPress={() => setShowCompleted(!showCompleted)}
              hitSlop={TouchTarget.minHitSlop}
            >
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={22}
                  color={Colors.success}
                />
                {"  "}Completed ({completed.length})
              </Text>
              <MaterialCommunityIcons
                name={showCompleted ? "chevron-up" : "chevron-down"}
                size={24}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
            {showCompleted &&
              completed.map((item, idx) => (
                <MedicineCard
                  key={`completed_${item.medicineId}_${item.time}_${idx}`}
                  name={item.medicineName}
                  time={item.time}
                  color={item.color}
                  isTaken={item.isTaken}
                  isSkipped={item.isSkipped}
                  onMarkTaken={() => {}}
                />
              ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      {medicines.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/medicine/add")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="plus"
            size={30}
            color={Colors.textOnPrimary}
          />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  progressSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    ...Elevation.low,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    flex: 1,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 6,
    minWidth: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xxl,
    lineHeight: 26,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    minHeight: TouchTarget.minSize,
  },
  emptyAddText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  sectionContainer: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  completedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Elevation.high,
  },
});
