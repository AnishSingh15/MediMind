import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    getDay,
    isSameDay,
    isToday,
    startOfMonth,
    subMonths
} from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Elevation, Spacing, TouchTarget } from '../../constants/theme';
import { DoseLog, useLogStore } from '../../store/useLogStore';
import { useMedicineStore } from '../../store/useMedicineStore';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HistoryScreen() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [logs, setLogs] = useState<DoseLog[]>([]);
    const [dayStatuses, setDayStatuses] = useState<Record<string, 'perfect' | 'partial' | 'missed' | 'none'>>({});
    const [refreshing, setRefreshing] = useState(false);
    const loadLogs = useLogStore((s) => s.loadLogsByDate);
    const medicines = useMedicineStore((s) => s.medicines);

    // Build calendar data
    const calendarData = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const startDay = getDay(monthStart);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Pad beginning
        const paddedDays: (Date | null)[] = Array(startDay).fill(null);
        paddedDays.push(...days);

        // Pad to complete rows
        while (paddedDays.length % 7 !== 0) {
            paddedDays.push(null);
        }

        return paddedDays;
    }, [currentMonth]);

    // Load day statuses for the month
    useEffect(() => {
        loadMonthStatuses();
    }, [currentMonth]);

    // Load selected day logs
    useEffect(() => {
        loadDayLogs(selectedDate);
    }, [selectedDate]);

    const loadMonthStatuses = async () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const statuses: Record<string, 'perfect' | 'partial' | 'missed' | 'none'> = {};

        for (const day of days) {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayLogs = await loadLogs(dateKey);

            if (dayLogs.length === 0) {
                statuses[dateKey] = 'none';
            } else {
                const taken = dayLogs.filter((l) => l.takenAt && !l.skipped).length;
                const total = dayLogs.length;
                if (taken === total) {
                    statuses[dateKey] = 'perfect';
                } else if (taken > 0) {
                    statuses[dateKey] = 'partial';
                } else {
                    statuses[dateKey] = 'missed';
                }
            }
        }

        setDayStatuses(statuses);
    };

    const loadDayLogs = async (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayLogs = await loadLogs(dateKey);
        setLogs(dayLogs);
    };

    const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMonthStatuses();
        await loadDayLogs(selectedDate);
        setRefreshing(false);
    }, [selectedDate, currentMonth]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'perfect': return Colors.success;
            case 'partial': return '#FFC107';
            case 'missed': return Colors.danger;
            default: return 'transparent';
        }
    };

    // Generate report
    const handleExportReport = async () => {
        try {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

            let report = `📊 MediMind Report\n${format(currentMonth, 'MMMM yyyy')}\n${'─'.repeat(30)}\n\n`;

            let totalDoses = 0;
            let totalTaken = 0;
            let totalSkipped = 0;

            for (const day of days) {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayLogs = await loadLogs(dateKey);

                if (dayLogs.length > 0) {
                    const taken = dayLogs.filter((l) => l.takenAt && !l.skipped).length;
                    const skipped = dayLogs.filter((l) => l.skipped).length;
                    totalDoses += dayLogs.length;
                    totalTaken += taken;
                    totalSkipped += skipped;

                    const emoji = taken === dayLogs.length ? '✅' : taken > 0 ? '🟡' : '❌';
                    report += `${emoji} ${format(day, 'EEE, MMM d')}: ${taken}/${dayLogs.length} taken`;
                    if (skipped > 0) report += ` (${skipped} skipped)`;
                    report += '\n';
                }
            }

            const adherence = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;

            report += `\n${'─'.repeat(30)}\n`;
            report += `📈 Summary\n`;
            report += `Total doses: ${totalDoses}\n`;
            report += `Taken: ${totalTaken} ✅\n`;
            report += `Skipped: ${totalSkipped} ❌\n`;
            report += `Adherence: ${adherence}%\n`;
            report += `\n💊 Active medicines: ${medicines.filter((m) => m.active).length}\n`;

            for (const med of medicines.filter((m) => m.active)) {
                report += `  • ${med.name} ${med.dosage}${med.unit} — ${med.times.join(', ')}\n`;
            }

            report += `\nGenerated by MediMind`;

            await Share.share({
                message: report,
                title: `MediMind Report — ${format(currentMonth, 'MMMM yyyy')}`,
            });
        } catch (e) {
            if ((e as any)?.message !== 'User dismissed the share sheet') {
                Alert.alert('Export Failed', 'Could not generate the report.');
            }
        }
    };

    const takenCount = logs.filter((l) => l.takenAt && !l.skipped).length;
    const skippedCount = logs.filter((l) => l.skipped).length;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>History</Text>
                <TouchableOpacity onPress={handleExportReport} hitSlop={TouchTarget.minHitSlop}>
                    <MaterialCommunityIcons name="share-variant" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
            >
                {/* Month Selector */}
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={goToPrevMonth} hitSlop={TouchTarget.minHitSlop} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</Text>
                    <TouchableOpacity onPress={goToNextMonth} hitSlop={TouchTarget.minHitSlop} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-right" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarCard}>
                    {/* Week day headers */}
                    <View style={styles.weekRow}>
                        {WEEK_DAYS.map((d) => (
                            <Text key={d} style={styles.weekDayLabel}>{d}</Text>
                        ))}
                    </View>

                    {/* Days grid */}
                    {Array.from({ length: calendarData.length / 7 }, (_, weekIdx) => (
                        <View key={weekIdx} style={styles.weekRow}>
                            {calendarData.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                                if (!day) {
                                    return <View key={`empty_${dayIdx}`} style={styles.dayCell} />;
                                }

                                const dateKey = format(day, 'yyyy-MM-dd');
                                const status = dayStatuses[dateKey] || 'none';
                                const isSelected = isSameDay(day, selectedDate);
                                const isTodayDate = isToday(day);

                                return (
                                    <TouchableOpacity
                                        key={dateKey}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.dayCellSelected,
                                        ]}
                                        onPress={() => setSelectedDate(day)}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[
                                            styles.dayNumber,
                                            isSelected && styles.dayNumberSelected,
                                            isTodayDate && !isSelected && styles.dayNumberToday,
                                        ]}>
                                            {format(day, 'd')}
                                        </Text>
                                        {status !== 'none' && (
                                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    {/* Legend */}
                    <View style={styles.legend}>
                        <LegendItem color={Colors.success} label="All taken" />
                        <LegendItem color="#FFC107" label="Partial" />
                        <LegendItem color={Colors.danger} label="Missed" />
                    </View>
                </View>

                {/* Selected Day Details */}
                <View style={styles.dayDetailsHeader}>
                    <Text style={styles.dayDetailsTitle}>
                        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
                    </Text>
                    {logs.length > 0 && (
                        <Text style={styles.dayDetailsSummary}>
                            {takenCount} taken • {skippedCount} skipped
                        </Text>
                    )}
                </View>

                {/* Dose Logs for Selected Day */}
                {logs.length === 0 ? (
                    <View style={styles.emptyDay}>
                        <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.primaryLight} />
                        <Text style={styles.emptyDayText}>No records for this day</Text>
                    </View>
                ) : (
                    logs.map((log, idx) => (
                        <View key={`${log.medicineId}_${log.scheduledTime}_${idx}`} style={styles.logItem}>
                            <View style={styles.logIcon}>
                                {log.skipped ? (
                                    <MaterialCommunityIcons name="close-circle" size={24} color={Colors.warning} />
                                ) : log.takenAt ? (
                                    <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />
                                ) : (
                                    <MaterialCommunityIcons name="clock-outline" size={24} color={Colors.textTertiary} />
                                )}
                            </View>
                            <View style={styles.logInfo}>
                                <Text style={styles.logName}>{log.medicineName}</Text>
                                <Text style={styles.logTime}>{formatTime12(log.scheduledTime)}</Text>
                            </View>
                            <Text style={[
                                styles.statusBadge,
                                log.skipped ? styles.badgeSkipped : log.takenAt ? styles.badgeTaken : styles.badgePending,
                            ]}>
                                {log.skipped ? 'SKIP' : log.takenAt ? 'TAKEN' : 'PENDING'}
                            </Text>
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
        </View>
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
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.screenPadding, paddingTop: Spacing.md,
    },
    title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
    scrollContent: { padding: Spacing.screenPadding, paddingTop: 0 },

    // Month selector
    monthSelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    navButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        borderRadius: 20, backgroundColor: Colors.primaryContainer,
    },
    monthLabel: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },

    // Calendar
    calendarCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.xl, ...Elevation.low,
    },
    weekRow: { flexDirection: 'row' },
    weekDayLabel: {
        flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600',
        color: Colors.textTertiary, paddingVertical: 8,
    },
    dayCell: {
        flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
        borderRadius: 8, marginVertical: 1,
    },
    dayCellSelected: { backgroundColor: Colors.primaryContainer },
    dayNumber: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
    dayNumberSelected: { fontWeight: '700', color: Colors.primary },
    dayNumberToday: { fontWeight: '700', color: Colors.primary },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

    // Legend
    legend: {
        flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg,
        marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 12, color: Colors.textSecondary },

    // Day details
    dayDetailsHeader: { marginBottom: Spacing.md },
    dayDetailsTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    dayDetailsSummary: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

    // Empty
    emptyDay: {
        alignItems: 'center', paddingVertical: 32, gap: Spacing.sm,
    },
    emptyDayText: { fontSize: 16, color: Colors.textTertiary },

    // Log items
    logItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm, ...Elevation.low,
    },
    logIcon: { width: 28 },
    logInfo: { flex: 1 },
    logName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    logTime: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
    statusBadge: {
        fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 6, overflow: 'hidden',
    },
    badgeTaken: { backgroundColor: '#E8F5E9', color: Colors.success },
    badgeSkipped: { backgroundColor: '#FFF3E0', color: Colors.warning },
    badgePending: { backgroundColor: '#F5F5F5', color: Colors.textTertiary },
});
