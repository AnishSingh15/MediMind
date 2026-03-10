import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Elevation, Spacing } from '../../constants/theme';
import { signOut } from '../../services/firebase';
import { showBatteryOptimizationGuide } from '../../services/notifications';

export default function SettingsScreen() {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('@medimind_userName').then((n) => n && setUserName(n));
        AsyncStorage.getItem('@medimind_userEmail').then((e) => e && setUserEmail(e));
    }, []);

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out? Your data will be kept safe.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await GoogleSignin.signOut();
                        } catch (e) {
                            // May fail if not signed in with Google
                        }
                        await signOut();
                        // The auth state listener in _layout.tsx will handle navigation
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            {/* User Info Card */}
            <View style={styles.content}>
                {userName ? (
                    <View style={styles.userCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{userName}</Text>
                            <Text style={styles.userEmail}>{userEmail}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Battery Optimization */}
                <TouchableOpacity
                    style={styles.settingItem}
                    onPress={showBatteryOptimizationGuide}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="battery-heart" size={28} color={Colors.primary} />
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>Battery Optimization</Text>
                        <Text style={styles.settingDesc}>Keep reminders reliable</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textTertiary} />
                </TouchableOpacity>

                {/* Sign Out */}
                <TouchableOpacity
                    style={[styles.settingItem, { marginTop: Spacing.md }]}
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="logout" size={28} color={Colors.danger} />
                    <View style={styles.settingInfo}>
                        <Text style={[styles.settingTitle, { color: Colors.danger }]}>Sign Out</Text>
                        <Text style={styles.settingDesc}>Your data stays synced</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textTertiary} />
                </TouchableOpacity>
            </View>
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
    content: {
        padding: Spacing.screenPadding,
        gap: Spacing.md,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
        gap: Spacing.md,
        ...Elevation.low,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.primary,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        gap: Spacing.md,
        ...Elevation.low,
    },
    settingInfo: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    settingDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
