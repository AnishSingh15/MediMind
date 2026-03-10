import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import ColorPicker from '../../components/ColorPicker';
import { commonMedicines, dayLabels, dayValues, frequencyOptions } from '../../constants/medicines';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../../constants/theme';
import {
    deleteMedicine as firebaseDeleteMedicine,
    updateMedicine as firebaseUpdateMedicine,
} from '../../services/firebase';
import {
    cancelMedicineNotifications,
    scheduleMedicineNotifications,
} from '../../services/notifications';
import { useMedicineStore } from '../../store/useMedicineStore';

export default function EditMedicineScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const getMedicineById = useMedicineStore((s) => s.getMedicineById);
    const updateInStore = useMedicineStore((s) => s.updateMedicine);
    const deleteFromStore = useMedicineStore((s) => s.deleteMedicine);

    const medicine = getMedicineById(id || '');

    // Form state — pre-filled from existing medicine
    const [name, setName] = useState(medicine?.name || '');
    const [times, setTimes] = useState<string[]>(medicine?.times || []);
    const [frequency, setFrequency] = useState<string>(medicine?.frequency || 'daily');
    const [customDays, setCustomDays] = useState<number[]>(medicine?.customDays || []);
    const [color, setColor] = useState<string>(medicine?.color || Colors.medicineColors[0]);
    const [saving, setSaving] = useState(false);

    // Time picker state
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());

    // Autocomplete
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestions = useMemo(() => {
        if (name.length < 2) return [];
        return commonMedicines.filter((m) =>
            m.toLowerCase().includes(name.toLowerCase())
        ).slice(0, 5);
    }, [name]);

    // If medicine not found, go back
    useEffect(() => {
        if (!medicine) {
            Alert.alert('Not Found', 'This medicine was not found.');
            router.back();
        }
    }, [medicine]);

    const handleAddTime = () => setShowTimePicker(true);

    const handleTimeChange = (_event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            if (!times.includes(timeStr)) {
                setTimes([...times, timeStr].sort());
            }
        }
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
            Alert.alert('Missing Information', 'Please enter the medicine name and dosage.');
            return false;
        }
        if (times.length === 0) {
            Alert.alert('Missing Information', 'Please add at least one reminder time.');
            return false;
        }
        if (frequency === 'custom' && customDays.length === 0) {
            Alert.alert('Missing Information', 'Please select at least one day for custom frequency.');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validate() || !id) return;
        setSaving(true);

        try {
            const updates = {
                name: name.trim(),
                times,
                frequency,
                customDays: frequency === 'custom' ? customDays : [],
                color,
            };

            // 1. Update Zustand store
            await updateInStore(id, updates);

            // 2. Reschedule notifications (times or frequency may have changed)
            try {
                // Cancel old notifications
                if (medicine?.notifIds && medicine.notifIds.length > 0) {
                    await cancelMedicineNotifications(medicine.notifIds);
                }
                // Schedule new ones
                const notifIds = await scheduleMedicineNotifications({
                    id,
                    name: updates.name,
                    times: updates.times,
                    frequency: updates.frequency,
                    customDays: updates.customDays,
                });
                await useMedicineStore.getState().updateNotifIds(id, notifIds);
            } catch (e) {
                console.warn('Failed to reschedule notifications:', e);
            }

            // 3. Try Firebase sync
            try {
                const userId = await AsyncStorage.getItem('@medimind_userId');
                if (userId) {
                    await firebaseUpdateMedicine(userId, id, updates);
                }
            } catch (e) {
                console.warn('Firebase sync deferred:', e);
            }

            router.back();
        } catch (e) {
            Alert.alert('Could not save', 'Something went wrong. Please try again.');
            console.error('Update medicine error:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Medicine',
            `Are you sure you want to delete "${name}"?\n\nThis will remove all reminders for this medicine.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;

                        // Cancel notifications
                        if (medicine?.notifIds && medicine.notifIds.length > 0) {
                            await cancelMedicineNotifications(medicine.notifIds);
                        }

                        // Remove from store
                        await deleteFromStore(id);

                        // Try Firebase delete
                        try {
                            const userId = await AsyncStorage.getItem('@medimind_userId');
                            if (userId) {
                                await firebaseDeleteMedicine(userId, id);
                            }
                        } catch (e) {
                            console.warn('Firebase delete deferred:', e);
                        }

                        router.back();
                    },
                },
            ]
        );
    };

    if (!medicine) return null;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                                    <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.addTimeButton} onPress={handleAddTime} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="clock-plus-outline" size={24} color={Colors.primary} />
                        <Text style={styles.addTimeText}>Select a Time</Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                        <DateTimePicker
                            value={pickerDate}
                            mode="time"
                            is24Hour={false}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleTimeChange}
                        />
                    )}
                </View>

                {/* Frequency */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Frequency</Text>
                    <View style={styles.frequencyRow}>
                        {frequencyOptions.map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.frequencyButton, frequency === f && styles.frequencyButtonActive]}
                                onPress={() => setFrequency(f)}
                                hitSlop={TouchTarget.minHitSlop}
                            >
                                <Text style={[styles.frequencyText, frequency === f && styles.frequencyTextActive]}>
                                    {f === 'daily' ? 'Every Day' : f === 'weekdays' ? 'Weekdays' : 'Custom'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {frequency === 'custom' && (
                        <View style={styles.customDaysRow}>
                            {dayLabels.map((label, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.dayButton, customDays.includes(dayValues[idx]) && styles.dayButtonActive]}
                                    onPress={() => toggleCustomDay(dayValues[idx])}
                                    hitSlop={TouchTarget.minHitSlop}
                                >
                                    <Text style={[styles.dayText, customDays.includes(dayValues[idx]) && styles.dayTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
                    <MaterialCommunityIcons name="content-save" size={24} color={Colors.textOnPrimary} />
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color={Colors.danger} />
                    <Text style={styles.deleteButtonText}>Delete Medicine</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function formatTime12(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const amPm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${amPm}`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: Spacing.screenPadding },
    section: { marginBottom: Spacing.xxl },
    sectionLabel: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
    textInput: { backgroundColor: Colors.surface, fontSize: 18 },
    textInputContent: { fontSize: 18, paddingVertical: 4 },
    suggestionsContainer: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.border, marginTop: 4, ...Elevation.medium,
    },
    suggestionItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    suggestionText: { fontSize: 18, color: Colors.textPrimary },
    timesContainer: { flexDirection: 'column', gap: Spacing.sm, marginBottom: Spacing.md },
    timeCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1,
        borderColor: Colors.border, ...Elevation.none,
    },
    timeCardHandle: { width: 4, height: 24, backgroundColor: Colors.primary, borderRadius: 2, marginRight: Spacing.md },
    timeCardText: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    timeCardRemove: { padding: Spacing.xs, backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md },
    addTimeButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primaryContainer, borderWidth: 2, borderColor: Colors.primary,
        borderRadius: BorderRadius.lg, borderStyle: 'dashed', paddingVertical: Spacing.lg,
        gap: Spacing.sm, minHeight: 64,
    },
    addTimeText: { fontSize: 18, fontWeight: '700', color: Colors.primaryDark },
    frequencyRow: { flexDirection: 'row', gap: Spacing.sm },
    frequencyButton: {
        flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border,
        alignItems: 'center', minHeight: 48, justifyContent: 'center',
    },
    frequencyButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
    frequencyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
    frequencyTextActive: { color: Colors.primary },
    customDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg, gap: Spacing.xs },
    dayButton: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2,
        borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
    },
    dayButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    dayText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
    dayTextActive: { color: Colors.textOnPrimary },
    saveButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg, gap: Spacing.sm,
        minHeight: TouchTarget.minSize, ...Elevation.medium,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { fontSize: 20, fontWeight: '700', color: Colors.textOnPrimary },
    deleteButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.danger, borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.lg,
        minHeight: TouchTarget.minSize,
    },
    deleteButtonText: { fontSize: 20, fontWeight: '700', color: Colors.danger },
});
