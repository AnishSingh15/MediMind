import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, TouchTarget } from '../constants/theme';

interface ColorPickerProps {
    selectedColor: string;
    onSelect: (color: string) => void;
}

export default function ColorPicker({ selectedColor, onSelect }: ColorPickerProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Card Color</Text>
            <View style={styles.colorsRow}>
                {Colors.medicineColors.map((color) => (
                    <TouchableOpacity
                        key={color}
                        style={[
                            styles.colorCircle,
                            { backgroundColor: color },
                            selectedColor === color && styles.selected,
                        ]}
                        onPress={() => onSelect(color)}
                        accessibilityLabel={`Select color ${color}`}
                        hitSlop={TouchTarget.minHitSlop}
                    >
                        {selectedColor === color && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    colorsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    selected: {
        borderColor: Colors.textPrimary,
        transform: [{ scale: 1.1 }],
    },
    checkmark: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
});
