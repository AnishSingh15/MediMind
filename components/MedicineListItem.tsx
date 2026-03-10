import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../constants/theme';
import TimeChip from './TimeChip';

interface MedicineListItemProps {
    id: string;
    name: string;
    dosage: number;
    unit: string;
    times: string[];
    color: string;
    active: boolean;
    onToggleActive: (id: string, active: boolean) => void;
    onPress: (id: string) => void;
}

export default function MedicineListItem({
    id,
    name,
    dosage,
    unit,
    times,
    color,
    active,
    onToggleActive,
    onPress,
}: MedicineListItemProps) {
    return (
        <TouchableOpacity
            style={[styles.card, { borderLeftColor: color }, !active && styles.cardInactive]}
            onPress={() => onPress(id)}
            activeOpacity={0.7}
            accessibilityLabel={`Edit ${name}`}
        >
            <View style={styles.cardContent}>
                <View style={styles.infoSection}>
                    <Text style={[styles.medicineName, !active && styles.textInactive]}>
                        {name}
                    </Text>
                    <Text style={[styles.dosageText, !active && styles.textInactive]}>
                        {dosage} {unit}
                    </Text>
                    <View style={styles.timesRow}>
                        {times.map((t) => (
                            <TimeChip key={t} time={t} showRemove={false} />
                        ))}
                    </View>
                </View>

                {/* Active/Inactive Toggle */}
                <TouchableOpacity
                    style={[styles.toggleContainer, active ? styles.toggleActive : styles.toggleInactive]}
                    onPress={() => onToggleActive(id, !active)}
                    hitSlop={TouchTarget.minHitSlop}
                    accessibilityLabel={`${active ? 'Deactivate' : 'Activate'} ${name}`}
                >
                    <View style={[styles.toggleThumb, active ? styles.thumbActive : styles.thumbInactive]} />
                </TouchableOpacity>
            </View>

            {/* Tap hint */}
            <View style={styles.editHint}>
                <MaterialCommunityIcons name="pencil" size={14} color={Colors.textTertiary} />
                <Text style={styles.editHintText}>Tap to edit</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: BorderRadius.lg,
        borderLeftWidth: 5,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        ...Elevation.low,
    },
    cardInactive: {
        opacity: 0.6,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    infoSection: {
        flex: 1,
        marginRight: Spacing.md,
    },
    medicineName: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    dosageText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    textInactive: {
        color: Colors.textTertiary,
    },
    timesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    toggleContainer: {
        width: 52,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    toggleActive: {
        backgroundColor: Colors.success,
    },
    toggleInactive: {
        backgroundColor: Colors.border,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    thumbActive: {
        alignSelf: 'flex-end',
    },
    thumbInactive: {
        alignSelf: 'flex-start',
    },
    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    editHintText: {
        fontSize: 12,
        color: Colors.textTertiary,
    },
});
