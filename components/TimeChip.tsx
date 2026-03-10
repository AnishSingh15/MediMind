import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BorderRadius, Colors, Spacing, TouchTarget } from '../constants/theme';

interface TimeChipProps {
    time: string; // '08:00'
    onRemove?: () => void;
    showRemove?: boolean;
}

export default function TimeChip({ time, onRemove, showRemove = true }: TimeChipProps) {
    // Convert 24h to 12h format for display
    const formatTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <View style={styles.chip}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.primary} />
            <Text style={styles.timeText}>{formatTime(time)}</Text>
            {showRemove && onRemove && (
                <TouchableOpacity
                    onPress={onRemove}
                    hitSlop={TouchTarget.minHitSlop}
                    accessibilityLabel={`Remove time ${formatTime(time)}`}
                    style={styles.removeBtn}
                >
                    <MaterialCommunityIcons name="close-circle" size={22} color={Colors.textTertiary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryContainer,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginRight: Spacing.sm,
        marginBottom: Spacing.sm,
        gap: 6,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primaryDark,
    },
    removeBtn: {
        marginLeft: 2,
    },
});
