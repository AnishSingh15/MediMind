import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../constants/theme';
import { logDose as firebaseLogDose } from '../services/firebase';
import { DoseLog, useLogStore } from '../store/useLogStore';

export default function LogDoseScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        medicineId: string;
        medicineName: string;
        scheduledTime: string;
        dosage: string;
        unit: string;
    }>();

    const logDoseToStore = useLogStore((s) => s.logDose);
    const [actualDosage, setActualDosage] = useState(params.dosage || '');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const formatTime = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const handleAction = async (action: 'taken' | 'skip') => {
        setSaving(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            const logData: DoseLog = {
                id: logId,
                medicineId: params.medicineId || '',
                medicineName: params.medicineName || '',
                scheduledTime: params.scheduledTime || '',
                scheduledDate: today,
                takenAt: action === 'taken' ? new Date() : null,
                skipped: action === 'skip',
                actualDosage: Number(actualDosage) || Number(params.dosage) || 0,
                note: note.trim(),
            };

            // Save to local store
            await logDoseToStore(logData);

            // Try Firebase sync (non-blocking)
            try {
                const userId = await AsyncStorage.getItem('@medimind_userId');
                if (userId) {
                    await firebaseLogDose(userId, logData);
                }
            } catch (e) {
                console.warn('Firebase log sync deferred:', e);
            }

            router.back();
        } catch (e) {
            Alert.alert('Could not save', 'Something went wrong. Please try again.');
            console.error('Log dose error:', e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.inner}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Close button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => router.back()}
                    hitSlop={TouchTarget.minHitSlop}
                >
                    <MaterialCommunityIcons name="close" size={28} color={Colors.textTertiary} />
                </TouchableOpacity>

                {/* Pill icon */}
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="pill" size={60} color={Colors.primary} />
                </View>

                {/* Medicine Info */}
                <Text style={styles.medicineName}>{params.medicineName}</Text>
                <Text style={styles.scheduledTime}>
                    Scheduled for {formatTime(params.scheduledTime || '')}
                </Text>

                {/* Dosage Input */}
                <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Dosage</Text>
                    <View style={styles.dosageRow}>
                        <TextInput
                            mode="outlined"
                            value={actualDosage}
                            onChangeText={setActualDosage}
                            keyboardType="numeric"
                            style={styles.dosageInput}
                            contentStyle={styles.dosageInputContent}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                            outlineStyle={{ borderRadius: BorderRadius.md }}
                        />
                        <Text style={styles.unitText}>{params.unit}</Text>
                    </View>
                </View>

                {/* Note Input */}
                <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Note (optional)</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="Add a note..."
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={2}
                        style={styles.noteInput}
                        contentStyle={styles.noteInputContent}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                        outlineStyle={{ borderRadius: BorderRadius.md }}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.takenButton]}
                        onPress={() => handleAction('taken')}
                        disabled={saving}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="check-bold" size={28} color={Colors.textOnSuccess} />
                        <Text style={styles.takenButtonText}>TAKEN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.skipButton]}
                        onPress={() => handleAction('skip')}
                        disabled={saving}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="close-thick" size={28} color={Colors.danger} />
                        <Text style={styles.skipButtonText}>SKIP</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    inner: {
        flex: 1,
        padding: Spacing.screenPadding,
        paddingTop: Spacing.lg,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: Spacing.sm,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xxl,
    },
    medicineName: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    scheduledTime: {
        fontSize: 18,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xxxl,
    },
    fieldSection: {
        marginBottom: Spacing.xxl,
    },
    fieldLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    dosageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    dosageInput: {
        flex: 1,
        backgroundColor: Colors.surface,
        fontSize: 20,
    },
    dosageInputContent: {
        fontSize: 20,
    },
    unitText: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    noteInput: {
        backgroundColor: Colors.surface,
        fontSize: 18,
    },
    noteInputContent: {
        fontSize: 18,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: 'auto',
        paddingBottom: Spacing.xxl,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        minHeight: 64,
        ...Elevation.medium,
    },
    takenButton: {
        backgroundColor: Colors.success,
    },
    takenButtonText: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textOnSuccess,
    },
    skipButton: {
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.danger,
    },
    skipButtonText: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.danger,
    },
});
