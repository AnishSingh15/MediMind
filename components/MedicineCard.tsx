import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../constants/theme';

interface MedicineCardProps {
    name: string;
    dosage: number;
    unit: string;
    time: string;
    color: string;
    isTaken: boolean;
    isSkipped: boolean;
    onMarkTaken: () => void;
}

export default function MedicineCard({
    name,
    dosage,
    unit,
    time,
    color,
    isTaken,
    isSkipped,
    onMarkTaken,
}: MedicineCardProps) {
    const formatTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <View style={[styles.card, { borderLeftColor: color }, ...Object.values(Elevation.low)]}>
            <View style={styles.cardContent}>
                <View style={styles.leftSection}>
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <View style={styles.infoSection}>
                        <Text style={styles.medicineName}>{name}</Text>
                        <Text style={styles.dosageText}>
                            {dosage} {unit}
                        </Text>
                        <View style={styles.timeRow}>
                            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.textTertiary} />
                            <Text style={styles.timeText}>{formatTime(time)}</Text>
                        </View>
                    </View>
                </View>

                {isTaken ? (
                    <View style={styles.takenBadge}>
                        <MaterialCommunityIcons name="check-circle" size={28} color={Colors.success} />
                        <Text style={styles.takenText}>Taken</Text>
                    </View>
                ) : isSkipped ? (
                    <View style={styles.skippedBadge}>
                        <MaterialCommunityIcons name="close-circle" size={28} color={Colors.danger} />
                        <Text style={styles.skippedText}>Skipped</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.markButton}
                        onPress={onMarkTaken}
                        activeOpacity={0.7}
                        hitSlop={TouchTarget.minHitSlop}
                        accessibilityLabel={`Mark ${name} as taken`}
                    >
                        <Text style={styles.markButtonText}>Mark as{'\n'}Taken</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: BorderRadius.lg,
        borderLeftWidth: 5,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    colorDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: Spacing.md,
    },
    infoSection: {
        flex: 1,
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
        marginBottom: 4,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 16,
        color: Colors.textTertiary,
        fontWeight: '500',
    },
    markButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        minWidth: 100,
        minHeight: TouchTarget.minSize,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    markButtonText: {
        color: Colors.textOnPrimary,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    takenBadge: {
        alignItems: 'center',
        gap: 2,
    },
    takenText: {
        color: Colors.success,
        fontSize: 14,
        fontWeight: '600',
    },
    skippedBadge: {
        alignItems: 'center',
        gap: 2,
    },
    skippedText: {
        color: Colors.danger,
        fontSize: 14,
        fontWeight: '600',
    },
});
