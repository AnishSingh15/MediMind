import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MedicineListItem from '../../components/MedicineListItem';
import { Colors, Elevation, Spacing, TouchTarget } from '../../constants/theme';
import { deleteMedicine as firebaseDelete, updateMedicine as firebaseUpdate } from '../../services/firebase';
import { cancelMedicineNotifications, scheduleMedicineNotifications } from '../../services/notifications';
import { useMedicineStore } from '../../store/useMedicineStore';

export default function MedicinesScreen() {
    const router = useRouter();
    const medicines = useMedicineStore((s) => s.medicines);
    const loadMedicines = useMedicineStore((s) => s.loadMedicines);
    const updateMedicine = useMedicineStore((s) => s.updateMedicine);
    const deleteMedicine = useMedicineStore((s) => s.deleteMedicine);
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMedicines();
        setRefreshing(false);
    }, []);

    const handleToggleActive = async (id: string, newActive: boolean) => {
        const med = medicines.find((m) => m.id === id);
        if (!med) return;

        // Update store
        await updateMedicine(id, { active: newActive });

        // Handle notifications
        if (!newActive) {
            // Deactivating — cancel notifications
            if (med.notifIds.length > 0) {
                await cancelMedicineNotifications(med.notifIds);
            }
        } else {
            // Reactivating — reschedule notifications
            const notifIds = await scheduleMedicineNotifications({
                id: med.id,
                name: med.name,
                times: med.times,
                frequency: med.frequency,
                customDays: med.customDays,
            });
            await useMedicineStore.getState().updateNotifIds(id, notifIds);
        }

        // Try Firebase sync
        try {
            const userId = await AsyncStorage.getItem('@medimind_userId');
            if (userId) {
                await firebaseUpdate(userId, id, { active: newActive });
            }
        } catch (e) {
            console.warn('Firebase sync deferred:', e);
        }
    };

    const handleDeleteMedicine = (id: string, name: string) => {
        Alert.alert(
            'Delete Medicine',
            `Are you sure you want to delete "${name}"? This will also remove all reminders for it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const med = medicines.find((m) => m.id === id);

                        // Cancel notifications
                        if (med?.notifIds && med.notifIds.length > 0) {
                            await cancelMedicineNotifications(med.notifIds);
                        }

                        // Remove from store
                        await deleteMedicine(id);

                        // Try Firebase delete
                        try {
                            const userId = await AsyncStorage.getItem('@medimind_userId');
                            if (userId) {
                                await firebaseDelete(userId, id);
                            }
                        } catch (e) {
                            console.warn('Firebase delete deferred:', e);
                        }
                    },
                },
            ]
        );
    };

    const handlePressMedicine = (id: string) => {
        router.push({ pathname: '/medicine/[id]' as any, params: { id } });
    };

    const activeCount = medicines.filter((m) => m.active).length;
    const inactiveCount = medicines.filter((m) => !m.active).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Medicines</Text>
                {medicines.length > 0 && (
                    <Text style={styles.subtitle}>
                        {activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} paused` : ''}
                    </Text>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
            >
                {/* Empty State */}
                {medicines.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="pill" size={80} color={Colors.primaryLight} />
                        <Text style={styles.emptyTitle}>No medicines yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Add your first medicine to get started with reminders
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyAddButton}
                            onPress={() => router.push('/medicine/add')}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="plus" size={24} color={Colors.textOnPrimary} />
                            <Text style={styles.emptyAddText}>Add Medicine</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Medicine List */}
                {medicines.map((med) => (
                    <MedicineListItem
                        key={med.id}
                        id={med.id}
                        name={med.name}
                        times={med.times}
                        color={med.color}
                        active={med.active}
                        onToggleActive={handleToggleActive}
                        onPress={handlePressMedicine}
                    />
                ))}

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* FAB */}
            {medicines.length > 0 && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/medicine/add')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="plus" size={30} color={Colors.textOnPrimary} />
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
    header: {
        padding: Spacing.screenPadding,
        paddingTop: Spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    scrollContent: {
        padding: Spacing.screenPadding,
        paddingTop: 0,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: Spacing.lg,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    emptySubtitle: {
        fontSize: 18,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: Spacing.xxl,
        lineHeight: 26,
    },
    emptyAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        borderRadius: 16,
        gap: Spacing.sm,
        marginTop: Spacing.lg,
        minHeight: TouchTarget.minSize,
    },
    emptyAddText: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textOnPrimary,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Elevation.high,
    },
});
