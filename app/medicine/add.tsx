import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import ColorPicker from "../../components/ColorPicker";
import {
    commonMedicines,
    dayLabels,
    dayValues,
    frequencyLabels,
    frequencyOptions,
} from "../../constants/medicines";
import {
    BorderRadius,
    Colors,
    Elevation,
    Spacing,
    TouchTarget,
} from "../../constants/theme";
import { addMedicine as firebaseAddMedicine } from "../../services/firebase";
import { scheduleMedicineNotifications } from "../../services/notifications";
import { Medicine, useMedicineStore } from "../../store/useMedicineStore";

export default function AddMedicineScreen() {
  const router = useRouter();
  const addToStore = useMedicineStore((s) => s.addMedicine);

  // Form state
  const [name, setName] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string>("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [color, setColor] = useState<string>(Colors.medicineColors[0]);
  const [saving, setSaving] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  // Autocomplete suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    if (name.length < 2) return [];
    return commonMedicines
      .filter((m) => m.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 5);
  }, [name]);

  const handleAddTime = () => {
    setShowTimePicker(true);
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: picker closes on select, add time immediately
      setShowTimePicker(false);
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, "0");
        const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
        const timeStr = `${hours}:${minutes}`;
        if (!times.includes(timeStr)) {
          setTimes([...times, timeStr].sort());
        }
      }
    } else {
      // iOS: just update the spinner value, don't add yet
      if (selectedDate) {
        setPickerDate(selectedDate);
      }
    }
  };

  const handleConfirmTime = () => {
    const hours = pickerDate.getHours().toString().padStart(2, "0");
    const minutes = pickerDate.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;
    if (!times.includes(timeStr)) {
      setTimes([...times, timeStr].sort());
    }
    setShowTimePicker(false);
  };

  const handleRemoveTime = (timeToRemove: string) => {
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  const toggleCustomDay = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      setCustomDays([...customDays, day]);
    }
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter the medicine name and dosage.",
      );
      return false;
    }
    if (times.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please add at least one reminder time.",
      );
      return false;
    }
    if (frequency === "custom" && customDays.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please select at least one day for custom frequency.",
      );
      return false;
    }
    if (frequency === "weekly" && customDays.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please select the day of the week for your weekly reminder.",
      );
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const medicineData = {
        name: name.trim(),
        times,
        frequency,
        customDays:
          frequency === "custom" || frequency === "weekly" ? customDays : [],
        color,
        active: true,
        notifIds: [],
        startDate: new Date(),
      };

      // Generate a temporary local ID
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // 1. Save to Zustand store (immediately visible in UI)
      const medicine: Medicine = { ...medicineData, id: localId };
      await addToStore(medicine);

      // 2. Schedule notifications
      try {
        const notifIds = await scheduleMedicineNotifications({
          id: localId,
          name: medicineData.name,
          times: medicineData.times,
          frequency: medicineData.frequency,
          customDays: medicineData.customDays,
        });
        // Update store with notification IDs
        const store = useMedicineStore.getState();
        store.updateNotifIds(localId, notifIds);
      } catch (e) {
        console.warn("Failed to schedule notifications:", e);
      }

      // 3. Try Firebase sync (non-blocking, may fail offline)
      try {
        const userId = await AsyncStorage.getItem("@medimind_userId");
        if (userId) {
          const firebaseId = await firebaseAddMedicine(userId, medicineData);
          console.log("Firebase sync OK, id:", firebaseId);
        } else {
          console.warn("Firebase sync skipped: no userId in AsyncStorage");
        }
      } catch (e: any) {
        // Log detailed error for debugging Firestore permission issues
        console.warn("Firebase sync failed:", e?.code || e?.message || e);
      }

      // Navigate back
      router.back();
    } catch (e) {
      Alert.alert("Could not save", "Something went wrong. Please try again.");
      console.error("Save medicine error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Medicine Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Medicine Name</Text>
          <TextInput
            mode="outlined"
            placeholder="e.g. Vitamin D 60000 IU"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={styles.textInput}
            contentStyle={styles.textInputContent}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            outlineStyle={{ borderRadius: BorderRadius.md }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setName(s);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reminder Times */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reminder Times</Text>
          <View style={styles.timesContainer}>
            {times.map((t) => (
              <View key={t} style={styles.timeCard}>
                <View style={styles.timeCardHandle} />
                <Text style={styles.timeCardText}>{formatTime12(t)}</Text>
                <TouchableOpacity
                  style={styles.timeCardRemove}
                  onPress={() => handleRemoveTime(t)}
                  hitSlop={TouchTarget.minHitSlop}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={22}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addTimeButton}
            onPress={handleAddTime}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="clock-plus-outline"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.addTimeText}>Select a Time</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
              {Platform.OS === "ios" && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                  >
                    <Text style={{ color: Colors.textSecondary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmTime}
                    style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.primary, borderRadius: BorderRadius.md }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Add Time</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Frequency</Text>
          <View style={styles.frequencyGrid}>
            {frequencyOptions.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.frequencyButton,
                  frequency === f && styles.frequencyButtonActive,
                ]}
                onPress={() => {
                  setFrequency(f);
                  if (f === "weekly") {
                    // Reset to empty so user must pick one day
                    setCustomDays([]);
                  }
                }}
                hitSlop={TouchTarget.minHitSlop}
              >
                <MaterialCommunityIcons
                  name={
                    f === "daily"
                      ? "calendar-today"
                      : f === "weekly"
                        ? "calendar-week"
                        : f === "weekdays"
                          ? "calendar-week-begin"
                          : "calendar-check"
                  }
                  size={18}
                  color={frequency === f ? Colors.primary : Colors.textTertiary}
                />
                <Text
                  style={[
                    styles.frequencyText,
                    frequency === f && styles.frequencyTextActive,
                  ]}
                >
                  {frequencyLabels[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(frequency === "custom" || frequency === "weekly") && (
            <>
              <Text style={styles.dayPickerHint}>
                {frequency === "weekly"
                  ? "Select the day of the week"
                  : "Select one or more days"}
              </Text>
              <View style={styles.customDaysRow}>
                {dayLabels.map((label, idx) => {
                  const isSelected = customDays.includes(dayValues[idx]);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dayButton,
                        isSelected && styles.dayButtonActive,
                      ]}
                      onPress={() => {
                        if (frequency === "weekly") {
                          // Single selection for weekly
                          setCustomDays(isSelected ? [] : [dayValues[idx]]);
                        } else {
                          toggleCustomDay(dayValues[idx]);
                        }
                      }}
                      hitSlop={TouchTarget.minHitSlop}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Color Picker */}
        <View style={styles.section}>
          <ColorPicker selectedColor={color} onSelect={setColor} />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="content-save"
            size={24}
            color={Colors.textOnPrimary}
          />
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Medicine"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const amPm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${amPm}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.surface,
    fontSize: 18,
  },
  textInputContent: {
    fontSize: 18,
    paddingVertical: 4,
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    ...Elevation.medium,
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  suggestionText: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  dosageRow: {
    flexDirection: "column",
    gap: Spacing.md,
  },
  dosageInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  unitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  unitButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: Colors.primary,
  },
  timesContainer: {
    flexDirection: "column",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Elevation.none,
  },
  timeCardHandle: {
    width: 4,
    height: 24,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  timeCardText: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  timeCardRemove: {
    padding: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
  },
  addTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryContainer,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    borderStyle: "dashed",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 64,
  },
  addTimeText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  frequencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  frequencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  frequencyButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  frequencyText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  frequencyTextActive: {
    color: Colors.primary,
  },
  dayPickerHint: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  customDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  dayButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: Colors.textOnPrimary,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: TouchTarget.minSize,
    ...Elevation.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
});
